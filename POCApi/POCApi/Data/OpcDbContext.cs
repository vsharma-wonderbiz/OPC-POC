using System;
using Microsoft.EntityFrameworkCore;
using POCApi.Models;

namespace POCApi.Data
{
    public class OpcDbContext : DbContext
    {
        public OpcDbContext(DbContextOptions<OpcDbContext> options)
           : base(options)
        {
        }

        public DbSet<MachineSignalcs> Machinedata { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {   
            modelBuilder.Entity<MachineSignalcs>().ToTable("machine_signals"); // exact table name

        }
    }
}
