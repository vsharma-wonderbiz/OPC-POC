using Microsoft.EntityFrameworkCore;
using POCApi.Data;
using POCApi.Dtos;
using POCApi.Interface;

namespace POCApi.Services
{
    public class SignalService : ISignalService
    {
        private readonly OpcDbContext _db;

        public SignalService(OpcDbContext db)
        {
            _db = db;
        }

        public async Task<List<string>> GetMachinesAsync()
        {
            return await _db.Machinedata
                 .Select(x => x.Machine)
                 .Distinct()
                 .ToListAsync();
        }

        public async Task<List<string>> GetSignalsByMachineAsync(string machine)
        {
            try
            {
                return await _db.Machinedata
                    .Where(x => x.Machine == machine)
                    .Select(a => a.Signal)
                    .Distinct()
                    .ToListAsync();
            }catch(Exception ex)
            {
                throw new Exception("Some error in db");
            }
        }

        public async Task<List<SignalDataDto>> GetSignalDataAsync(
       string machine,
       string signal,
       DateTime from,
       DateTime to)
        {
            try { 
            return await _db.Machinedata
                .Where(x =>
                    x.Machine == machine &&
                    x.Signal == signal &&
                    x.Timestamp >= from &&
                    x.Timestamp <= to)
                .OrderBy(x => x.Timestamp)
                .Select(x => new SignalDataDto
                {
                    Timestamp = x.Timestamp,
                    Value = x.Value,
                    Unit = x.Unit
                })
                .ToListAsync();
            }
            catch (Exception ex)
            {
                throw new Exception("Something went wrong"+ex.Message);
            }
        }

    }
}
