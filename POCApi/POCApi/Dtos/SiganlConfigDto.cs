using POCApi.Models;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace POCApi.Dtos
{
    public class SignalConfigDto
    {
        
        [Required(ErrorMessage = "MachineId is required")]
        public string MachineId { get; set; }

        [Required(ErrorMessage = "Signal name is required")]
        [StringLength(50, MinimumLength = 2,
            ErrorMessage = "Signal name must be between 2 and 50 characters")]
        [RegularExpression(@"^[a-zA-Z0-9_]+$",
            ErrorMessage = "Signal name can contain only letters, numbers, and underscore")]
        public string SignalName { get; set; }

       
        [Range(1, 247, ErrorMessage = "SlaveId must be between 1 and 247")]
        public int SlaveId { get; set; }

        
        [Range(0, 65535, ErrorMessage = "Register address must be between 0 and 65535")]
        public int RegisterAddress { get; set; }

        [Required(ErrorMessage = "Unit is required")]
        [StringLength(10, ErrorMessage = "Unit cannot exceed 10 characters")]
        public string Unit { get; set; }
    }
}
