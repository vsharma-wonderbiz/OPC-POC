using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using POCApi.Data;
using POCApi.Dtos;
using POCApi.Interface;

namespace POCApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MachineController : ControllerBase
    {
        private readonly OpcDbContext _context;
        private readonly ISignalService _signalService;
        private readonly BackfillService _backfillService;
        public MachineController(OpcDbContext context, ISignalService signalService,BackfillService backfillService)
        {
            _context = context;
            _signalService = signalService;
            _backfillService = backfillService;

        }

        [HttpGet("test-db")]
        public IActionResult TestDb()
        {
            using var conn = _context.Database.GetDbConnection();
            conn.Open();
            return Ok("SQLite DB Connected Successfully");
        }

        [HttpGet]
        public async Task<IActionResult> GetAllMAchine()
        {
            try
            {
                var Machines = await _signalService.GetMachinesAsync();

                return Ok(Machines);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{machine}/signals")]
        public async Task<IActionResult> GetSignals(string machine)
        {
            try
            {
                var signals = await _signalService.GetSignalsByMachineAsync(machine);

                return Ok(signals);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("data")]
        public async Task<IActionResult> GetData(
        [FromQuery] string machine,
        [FromQuery] string signal,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to)
        {
            try
            {
                Console.WriteLine($"Machine: {machine}, Signal: {signal}, From: {from}, To: {to}");

                var data = await _signalService.GetSignalDataAsync(machine, signal, from, to);

                return Ok(data);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }



        [HttpGet("signal-averages")]
        public async Task<IActionResult> GetSignalAverages(
        [FromQuery] string machine,
        [FromQuery] int days = 7
    )
        {
            if (string.IsNullOrWhiteSpace(machine))
                return BadRequest("Machine is required");

            if (days <= 0)
                return BadRequest("Days must be greater than 0");

            var data = await _signalService
                .GetAverageByMachineAsync(machine, days);

            return Ok(new
            {
                machine = machine,
                periodDays = days,
                signals = data
            });
        }



            [HttpPost("Backfill")]
        public async Task<IActionResult> RunBackfill(BackfillRequestDto dto)
        {
            await _backfillService.RunBackfillAsync(dto);
            return Ok();
        }
    }
}