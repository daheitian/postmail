/**
 * Timezone List
 *
 * Provides a curated list of timezones for the settings UI
 * and a helper to map IANA timezone names to our list entries.
 */

export interface TimezoneEntry {
  /** Display value stored in settings */
  value: string;
  /** Human-readable label for the select UI */
  label: string;
  /** UTC offset string, e.g. "+08:00" */
  offset: string;
  /** IANA timezone names that map to this entry */
  iana: string[];
}

export const TIMEZONES: TimezoneEntry[] = [
  {
    value: "International Date Line West",
    label: "(UTC-12:00) International Date Line West",
    offset: "-12:00",
    iana: ["Etc/GMT+12"],
  },
  {
    value: "American Samoa",
    label: "(UTC-11:00) American Samoa",
    offset: "-11:00",
    iana: ["Pacific/Pago_Pago", "Pacific/Midway", "Etc/GMT+11"],
  },
  {
    value: "Hawaii",
    label: "(UTC-10:00) Hawaii",
    offset: "-10:00",
    iana: ["Pacific/Honolulu", "Etc/GMT+10"],
  },
  {
    value: "Alaska",
    label: "(UTC-09:00) Alaska",
    offset: "-09:00",
    iana: ["America/Anchorage", "America/Juneau", "America/Nome"],
  },
  {
    value: "Pacific Time (US & Canada)",
    label: "(UTC-08:00) Pacific Time (US & Canada)",
    offset: "-08:00",
    iana: ["America/Los_Angeles", "America/Vancouver", "America/Tijuana"],
  },
  {
    value: "Mountain Time (US & Canada)",
    label: "(UTC-07:00) Mountain Time (US & Canada)",
    offset: "-07:00",
    iana: [
      "America/Denver",
      "America/Edmonton",
      "America/Phoenix",
      "America/Boise",
    ],
  },
  {
    value: "Central Time (US & Canada)",
    label: "(UTC-06:00) Central Time (US & Canada)",
    offset: "-06:00",
    iana: [
      "America/Chicago",
      "America/Winnipeg",
      "America/Mexico_City",
      "America/Guatemala",
    ],
  },
  {
    value: "Eastern Time (US & Canada)",
    label: "(UTC-05:00) Eastern Time (US & Canada)",
    offset: "-05:00",
    iana: [
      "America/New_York",
      "America/Toronto",
      "America/Detroit",
      "America/Indiana/Indianapolis",
      "America/Bogota",
      "America/Lima",
    ],
  },
  {
    value: "Atlantic Time (Canada)",
    label: "(UTC-04:00) Atlantic Time (Canada)",
    offset: "-04:00",
    iana: [
      "America/Halifax",
      "America/Caracas",
      "America/Santiago",
      "America/La_Paz",
    ],
  },
  {
    value: "Newfoundland",
    label: "(UTC-03:30) Newfoundland",
    offset: "-03:30",
    iana: ["America/St_Johns"],
  },
  {
    value: "Buenos Aires",
    label: "(UTC-03:00) Buenos Aires",
    offset: "-03:00",
    iana: [
      "America/Argentina/Buenos_Aires",
      "America/Sao_Paulo",
      "America/Montevideo",
    ],
  },
  {
    value: "Mid-Atlantic",
    label: "(UTC-02:00) Mid-Atlantic",
    offset: "-02:00",
    iana: ["Atlantic/South_Georgia", "Etc/GMT+2"],
  },
  {
    value: "Azores",
    label: "(UTC-01:00) Azores",
    offset: "-01:00",
    iana: ["Atlantic/Azores", "Atlantic/Cape_Verde"],
  },
  {
    value: "UTC",
    label: "(UTC+00:00) UTC",
    offset: "+00:00",
    iana: ["Etc/UTC", "UTC", "Etc/GMT", "Africa/Accra"],
  },
  {
    value: "London",
    label: "(UTC+00:00) London",
    offset: "+00:00",
    iana: ["Europe/London", "Europe/Dublin", "Europe/Lisbon"],
  },
  {
    value: "Central European Time",
    label: "(UTC+01:00) Central European Time",
    offset: "+01:00",
    iana: [
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Amsterdam",
      "Europe/Rome",
      "Europe/Madrid",
      "Europe/Brussels",
      "Europe/Vienna",
      "Europe/Warsaw",
      "Europe/Prague",
      "Europe/Stockholm",
      "Europe/Oslo",
      "Europe/Copenhagen",
      "Europe/Zurich",
      "Africa/Lagos",
    ],
  },
  {
    value: "Eastern European Time",
    label: "(UTC+02:00) Eastern European Time",
    offset: "+02:00",
    iana: [
      "Europe/Helsinki",
      "Europe/Athens",
      "Europe/Bucharest",
      "Europe/Istanbul",
      "Africa/Cairo",
      "Africa/Johannesburg",
      "Asia/Jerusalem",
      "Asia/Beirut",
    ],
  },
  {
    value: "Moscow",
    label: "(UTC+03:00) Moscow",
    offset: "+03:00",
    iana: [
      "Europe/Moscow",
      "Europe/Minsk",
      "Asia/Baghdad",
      "Asia/Riyadh",
      "Africa/Nairobi",
      "Asia/Kuwait",
    ],
  },
  {
    value: "Tehran",
    label: "(UTC+03:30) Tehran",
    offset: "+03:30",
    iana: ["Asia/Tehran"],
  },
  {
    value: "Dubai",
    label: "(UTC+04:00) Dubai",
    offset: "+04:00",
    iana: ["Asia/Dubai", "Asia/Muscat", "Asia/Baku", "Asia/Tbilisi"],
  },
  {
    value: "Kabul",
    label: "(UTC+04:30) Kabul",
    offset: "+04:30",
    iana: ["Asia/Kabul"],
  },
  {
    value: "Karachi",
    label: "(UTC+05:00) Karachi",
    offset: "+05:00",
    iana: ["Asia/Karachi", "Asia/Tashkent", "Asia/Yekaterinburg"],
  },
  {
    value: "Mumbai",
    label: "(UTC+05:30) Mumbai",
    offset: "+05:30",
    iana: ["Asia/Kolkata", "Asia/Calcutta", "Asia/Colombo"],
  },
  {
    value: "Kathmandu",
    label: "(UTC+05:45) Kathmandu",
    offset: "+05:45",
    iana: ["Asia/Kathmandu"],
  },
  {
    value: "Dhaka",
    label: "(UTC+06:00) Dhaka",
    offset: "+06:00",
    iana: ["Asia/Dhaka", "Asia/Almaty", "Asia/Omsk"],
  },
  {
    value: "Yangon",
    label: "(UTC+06:30) Yangon",
    offset: "+06:30",
    iana: ["Asia/Yangon", "Asia/Rangoon"],
  },
  {
    value: "Bangkok",
    label: "(UTC+07:00) Bangkok",
    offset: "+07:00",
    iana: [
      "Asia/Bangkok",
      "Asia/Jakarta",
      "Asia/Ho_Chi_Minh",
      "Asia/Krasnoyarsk",
    ],
  },
  {
    value: "Beijing",
    label: "(UTC+08:00) Beijing",
    offset: "+08:00",
    iana: [
      "Asia/Shanghai",
      "Asia/Hong_Kong",
      "Asia/Taipei",
      "Asia/Singapore",
      "Asia/Kuala_Lumpur",
      "Asia/Makassar",
      "Asia/Irkutsk",
      "Australia/Perth",
    ],
  },
  {
    value: "Tokyo",
    label: "(UTC+09:00) Tokyo",
    offset: "+09:00",
    iana: ["Asia/Tokyo", "Asia/Seoul", "Asia/Yakutsk"],
  },
  {
    value: "Adelaide",
    label: "(UTC+09:30) Adelaide",
    offset: "+09:30",
    iana: ["Australia/Adelaide", "Australia/Darwin"],
  },
  {
    value: "Sydney",
    label: "(UTC+10:00) Sydney",
    offset: "+10:00",
    iana: [
      "Australia/Sydney",
      "Australia/Melbourne",
      "Australia/Brisbane",
      "Australia/Hobart",
      "Pacific/Guam",
      "Asia/Vladivostok",
    ],
  },
  {
    value: "Noumea",
    label: "(UTC+11:00) Noumea",
    offset: "+11:00",
    iana: ["Pacific/Noumea", "Asia/Magadan", "Pacific/Guadalcanal"],
  },
  {
    value: "Auckland",
    label: "(UTC+12:00) Auckland",
    offset: "+12:00",
    iana: ["Pacific/Auckland", "Pacific/Fiji", "Asia/Kamchatka"],
  },
  {
    value: "Nuku'alofa",
    label: "(UTC+13:00) Nuku'alofa",
    offset: "+13:00",
    iana: ["Pacific/Tongatapu", "Pacific/Apia"],
  },
];

/**
 * Maps an IANA timezone name (e.g. "Asia/Shanghai") to our timezone list value
 * (e.g. "Beijing"). Returns "UTC" if no match found.
 *
 * @param iana - IANA timezone identifier from Intl.DateTimeFormat
 * @returns The matching timezone value from TIMEZONES
 *
 * @example
 * ```ts
 * mapIanaToTimezone("Asia/Shanghai"); // "Beijing"
 * mapIanaToTimezone("America/New_York"); // "Eastern Time (US & Canada)"
 * mapIanaToTimezone("Unknown/Zone"); // "UTC"
 * ```
 */
export function mapIanaToTimezone(iana: string): string {
  for (const tz of TIMEZONES) {
    if (tz.iana.includes(iana)) {
      return tz.value;
    }
  }
  return "UTC";
}
