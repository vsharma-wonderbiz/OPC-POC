using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using POCApi.Data;
using POCApi.Interface;

namespace POCApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MachineController : ControllerBase
    {
        private readonly OpcDbContext _context;
        private readonly ISignalService _signalService;
        public MachineController(OpcDbContext context, ISignalService signalService)
        {
            _context = context;
            _signalService = signalService;

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
            } catch (Exception ex)
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
            } catch (Exception ex)
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
            }catch(Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
