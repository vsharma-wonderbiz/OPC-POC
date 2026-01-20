using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POCApi.Dtos;
using POCApi.Interface;

namespace POCApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ConfigController : ControllerBase
    {
        private readonly IMachineService _machineservice;
        private readonly IConfigServicecs _configservicecs;

        public ConfigController(IMachineService machineService,IConfigServicecs configServicecs)
        {
            _machineservice = machineService;
            _configservicecs = configServicecs;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllMachinesAsync()
        {
            try
            {
                var machines = await _machineservice.GetAllMachines();

                return Ok(machines);
            }catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("{machinename}")]
        public async Task<IActionResult> AddNewMachine(string machinename)
        {
            try
            {
                await _machineservice.AddMachine(machinename);

                return Ok("Machine Added Sucessfully");
            }catch(Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("AddSignal")]
        public async Task<IActionResult> AddNewConfigOnMachine(SignalConfigDto dto)
        {
            try
            {
                await _configservicecs.AddConfigOnMachine(dto);
                return Ok("Configuration Added Successfully");
            }catch(Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("opc/config")]
        public async Task<IActionResult> GetOpcConfig()
        {
            try
            {
                var config = await _configservicecs.BuildOpcRuntimeConfig();
                return Ok(config);
            }catch(Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
