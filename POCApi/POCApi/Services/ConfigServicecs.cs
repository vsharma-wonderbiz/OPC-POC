using Microsoft.EntityFrameworkCore;
using POCApi.Data;
using POCApi.Dtos;
using POCApi.Interface;
using POCApi.Models;

namespace POCApi.Services
{
    public class ConfigServicecs : IConfigServicecs
    {
        private readonly OpcDbContext _context;

        public ConfigServicecs(OpcDbContext context)
        {
            _context = context;
        }

        public async Task AddConfigOnMachine(SignalConfigDto dto)
        {
           
            if (dto == null)
                throw new ArgumentNullException(nameof(dto), "Signal configuration data is required");

          
            if (string.IsNullOrWhiteSpace(dto.MachineId))
                throw new ArgumentException("MachineId is required");

          
            if (string.IsNullOrWhiteSpace(dto.SignalName))
                throw new ArgumentException("Signal name is required");

            dto.SignalName = dto.SignalName.Trim();

           
            bool machineExists = await _context.Machines
                .AnyAsync(m => m.Id == dto.MachineId);

            if (!machineExists)
                throw new InvalidOperationException("Machine does not exist");

           
            bool signalExists = await _context.SignalConfigs.AnyAsync(s =>
                s.MachineId == dto.MachineId &&
                s.SignalName.ToLower() == dto.SignalName.ToLower());

            if (signalExists)
                throw new InvalidOperationException("Signal with same name already exists for this machine");

           
            bool registerExists = await _context.SignalConfigs.AnyAsync(s =>
                s.MachineId == dto.MachineId &&
                s.SlaveId == dto.SlaveId &&
                s.RegisterAddress == dto.RegisterAddress);

            if (registerExists)
                throw new InvalidOperationException(
                    "Same slave and register is already configured for this machine");

            var signalConfig = new SignalConfigs
            {
                Id = Guid.NewGuid().ToString(),
                MachineId = dto.MachineId,
                SignalName = dto.SignalName,
                SlaveId = dto.SlaveId,
                RegisterAddress = dto.RegisterAddress,
                Unit = dto.Unit
            };

  
            _context.SignalConfigs.Add(signalConfig);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
           
                throw new Exception("Failed to save signal configuration", ex);
            }
        }

    }
}
