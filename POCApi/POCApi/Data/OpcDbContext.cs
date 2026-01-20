using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
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

        public DbSet<Machines> Machines { get; set; }

        public DbSet<SignalConfigs> SignalConfigs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<MachineSignalcs>()
                 .ToTable("machine_signals", t => t.ExcludeFromMigrations());

            modelBuilder.Entity<MachineSignalcs>().ToTable("machine_signals");
            modelBuilder.Entity<Machines>().ToTable("Machines");// exact table name
            modelBuilder.Entity<SignalConfigs>().ToTable("SignalConfigs");


            modelBuilder.Entity<Machines>(entity =>
            {
                entity.ToTable("Machines");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id)
                      .HasConversion<string>(); // 👈 GUID → TEXT
            });

            modelBuilder.Entity<SignalConfigs>()
                    .HasOne(ms => ms.Machine)
                    .WithMany()
                    .HasForeignKey(ms => ms.MachineId)
                    .OnDelete(DeleteBehavior.Cascade);

        }

        
    }
}
