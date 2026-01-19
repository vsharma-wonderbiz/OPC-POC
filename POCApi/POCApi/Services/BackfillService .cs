using System.Data;
using Dapper;
using System.Diagnostics;
using Microsoft.Data.Sqlite;
using POCApi.Dtos;

public class BackfillService
{
    private readonly IDbConnection _db;

    public BackfillService(IDbConnection db)
    {
        _db = db;
    }

    private DateTime Normalize(DateTime dt)
    {
        return new DateTime(
            dt.Year,
            dt.Month,
            dt.Day,
            dt.Hour,
            dt.Minute,  
            dt.Second
        );
    }

    public async Task RunBackfillAsync(BackfillRequestDto dto)
    {

        int days = dto.Days;
        int intervalSeconds = dto.IntervalSeconds;
        int batchSize = dto.BatchSize;

        Console.WriteLine("=======================================");
        Console.WriteLine("BACKFILL STARTED");
        Console.WriteLine($"Days           : {days}");
        Console.WriteLine($"Interval(sec)  : {intervalSeconds}");
        Console.WriteLine($"Batch Size     : {batchSize}");
        Console.WriteLine("=======================================");

        var stopwatch = Stopwatch.StartNew();
        var machines = new[] { "Machine_1", "Machine_2", "Machine_3" };
        var signals = new[]
        {
            new { Name = "Voltage", Unit = "V", Min = 20, Max = 26 },
            new { Name = "Current", Unit = "A", Min = 30, Max = 50 },
            new { Name = "Temperature", Unit = "°C", Min = 50, Max = 70 }
        };

        var random = new Random();
        var startTime = Normalize(DateTime.Now.AddDays(-days));
        var endTime = Normalize(DateTime.Now);
        var buffer = new List<dynamic>(batchSize);
        int totalInserted = 0;

        using var transaction = _db.BeginTransaction();

        try
        {
            for (var time = startTime; time <= endTime; time = time.AddSeconds(intervalSeconds))
            {
                foreach (var machine in machines)
                {
                    foreach (var signal in signals)
                    {
                        var value = random.NextDouble() *
                                    (signal.Max - signal.Min) + signal.Min;

                        buffer.Add(new
                        {
                            machine,
                            signal = signal.Name,
                            value = Math.Round(value, 2),
                            unit = signal.Unit,
                            timestamp = time
                        });

                        if (buffer.Count >= batchSize)
                        {
                            await InsertBatchAsync(buffer, transaction);
                            totalInserted += buffer.Count;
                            buffer.Clear();
                            Console.WriteLine($"Inserted {totalInserted} rows...");
                        }
                    }
                }
            }

            // insert remaining rows
            if (buffer.Count > 0)
            {
                await InsertBatchAsync(buffer, transaction);
                totalInserted += buffer.Count;
            }

            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }

        stopwatch.Stop();

        Console.WriteLine("=======================================");
        Console.WriteLine("BACKFILL COMPLETED");
        Console.WriteLine($"Total Rows Inserted : {totalInserted}");
        Console.WriteLine($"Time Taken          : {stopwatch.Elapsed}");
        Console.WriteLine("=======================================");
    }

    private async Task InsertBatchAsync(List<dynamic> batch, IDbTransaction transaction, int maxRetries = 5)
    {
        var sql = @"
            INSERT INTO machine_signals
            (machine, signal, value, unit, timestamp)
            VALUES
            (@machine, @signal, @value, @unit, @timestamp)
        ";

        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            try
            {
                await _db.ExecuteAsync(sql, batch, transaction);
                return; // Success
            }
            catch (SqliteException ex) when (ex.SqliteErrorCode == 5) // SQLITE_BUSY
            {
                if (attempt == maxRetries - 1)
                {
                    Console.WriteLine($"Failed to insert batch after {maxRetries} attempts");
                    throw;
                }

                int delayMs = 100 * (attempt + 1); // Exponential backoff
                Console.WriteLine($"Database locked, retry {attempt + 1}/{maxRetries} in {delayMs}ms...");
                await Task.Delay(delayMs);
            }
        }
    }
}