using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Extensions
{
    public static class StringExtensions
    {
        public static bool IsPass(this string result)
        {
            return string.Equals(result, "PASS", StringComparison.OrdinalIgnoreCase);
        }

        public static string NormalizeFilter(this string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return "";

            value = value.Trim();

            return value.StartsWith("All ", StringComparison.OrdinalIgnoreCase) ? "" : value;
        }

        public static int ToInt(this object value, int defaultValue = 0)
        {
            if (value == null || value == DBNull.Value)
                return defaultValue;

            return int.TryParse(value.ToString(), out int result) ? result : defaultValue;
        }

        public static string ToText(this object value)
        {
            return value == null || value == DBNull.Value ? string.Empty : Convert.ToString(value);
        }

        private static readonly string[] DateFormats =
        {
            "yyyyMMdd",
            "yyyy-MM-dd"
        };

        public static DateTime ToDate(this object value, DateTime? defaultValue = null)
        {
            var text = value?.ToString()?.Trim();

            if (string.IsNullOrWhiteSpace(text))
                return defaultValue ?? DateTime.Today;

            return DateTime.TryParseExact(
                    text,
                    DateFormats,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out var result)
                    ? result
                    : defaultValue ?? DateTime.Today;
        }
    }
}
