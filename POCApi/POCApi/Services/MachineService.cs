using System.Reflection.PortableExecutable;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using POCApi.Data;
using POCApi.Interface;
using POCApi.Models;

namespace POCApi.Services
{
    public class MachineService :IMachineService
    {
        private readonly OpcDbContext _context;

        public MachineService(OpcDbContext context)
        {
            _context = context;
        }

        public async Task<List<Machines>> GetAllMachines()
        {
            try
            {
                var machines = await _context.Machines.ToListAsync();   

                if (machines == null || machines.Count == 0)
                {
                    return [];
                }

                return machines;
            }catch(Exception Ex)
            {
                throw new Exception(Ex.Message);
            }
        }

        public async Task AddMachine(string machineName)
        {
            if (string.IsNullOrWhiteSpace(machineName))
                throw new ArgumentException("Machine name is required");

            machineName = machineName.Trim().ToLower();

            if (machineName.Length < 3 || machineName.Length > 50)
                throw new ArgumentException("Machine name must be between 3 and 50 characters");

            if (!Regex.IsMatch(machineName, @"^[a-zA-Z0-9_]+$"))
                throw new ArgumentException("Machine name can contain only letters, numbers, and underscore");

            bool exists = await _context.Machines
                .AnyAsync(m => m.Name == machineName);

            if (exists)
                throw new InvalidOperationException("Machine with the same name already exists");

            var machine = new Machines
            {
                Id = Guid.NewGuid().ToString(),
                Name = machineName
            };

            _context.Machines.Add(machine);
            await _context.SaveChangesAsync();
        }


    }
}
