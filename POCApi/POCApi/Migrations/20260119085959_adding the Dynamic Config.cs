using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace POCApi.Migrations
{
    /// <inheritdoc />
    public partial class addingtheDynamicConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Machines",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Machines", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SignalConfigs",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    MachineId = table.Column<string>(type: "TEXT", nullable: false),
                    SignalName = table.Column<string>(type: "TEXT", nullable: false),
                    SlaveId = table.Column<int>(type: "INTEGER", nullable: false),
                    RegisterAddress = table.Column<int>(type: "INTEGER", nullable: false),
                    Unit = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SignalConfigs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SignalConfigs_Machines_MachineId",
                        column: x => x.MachineId,
                        principalTable: "Machines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SignalConfigs_MachineId",
                table: "SignalConfigs",
                column: "MachineId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SignalConfigs");

            migrationBuilder.DropTable(
                name: "Machines");
        }
    }
}
