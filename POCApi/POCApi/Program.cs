using Microsoft.Data.Sqlite;
using System.Data;
using Microsoft.EntityFrameworkCore;
using POCApi.Data;
using POCApi.Interface;
using POCApi.Services;
using Dapper;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<OpcDbContext>(options =>
    options.UseSqlite(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IDbConnection>(sp =>
{
    var connection = new SqliteConnection(
        builder.Configuration.GetConnectionString("DefaultConnection")
    );
    connection.Open();

    // ✅ FIX: Enable WAL mode and set timeout
    connection.Execute("PRAGMA journal_mode=WAL;");
    connection.Execute("PRAGMA busy_timeout=30000;");

    return connection;
});

builder.Services.AddScoped<ISignalService, SignalService>();
builder.Services.AddScoped<IMachineService, MachineService>();
builder.Services.AddScoped<IConfigServicecs, ConfigServicecs>();
builder.Services.AddScoped<BackfillService>();

builder.Services.AddCors(option =>
{
    option.AddPolicy("AllowReactApp", policy =>
    {
        policy
              .WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// ✅ ALSO FIX: Enable WAL mode for Entity Framework DbContext
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<OpcDbContext>();
    dbContext.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
    dbContext.Database.ExecuteSqlRaw("PRAGMA busy_timeout=30000;");
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.UseCors("AllowReactApp");
app.MapControllers();

app.Run();