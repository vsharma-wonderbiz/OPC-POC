namespace POCApi.Dtos
{
    public class BackfillRequestDto
    {
        public int Days { get; set; } = 30;   // ⚠ start with 7 days
        public int IntervalSeconds { get; set; } = 5;

        public int BatchSize { get; set; } = 5000;
    }
}
