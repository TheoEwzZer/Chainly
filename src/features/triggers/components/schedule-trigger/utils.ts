export function cronToHumanReadable(cronExpression: string): string {
  const parts: string[] = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return cronExpression;
  }

  const [minute, hour, day, month, weekday] = parts;

  const parseCronValue = (
    value: string,
    type: "minute" | "hour" | "day" | "month" | "weekday"
  ): string => {
    if (value === "*") {
      return "every";
    }

    if (value.includes("/")) {
      const [range, step] = value.split("/");
      const stepNum: number = Number.parseInt(step, 10);
      if (Number.isNaN(stepNum)) {
        return value;
      }

      if (range === "*") {
        return `every ${stepNum}`;
      }

      if (range.includes("-")) {
        const [start, end] = range.split("-").map(Number);
        if (!Number.isNaN(start) && !Number.isNaN(end)) {
          return `every ${stepNum} from ${start} to ${end}`;
        }
      }
      return `every ${stepNum} of ${range}`;
    }

    if (value.includes("-")) {
      const [start, end] = value.split("-").map(Number);
      if (!Number.isNaN(start) && !Number.isNaN(end)) {
        if (type === "hour") {
          return `${start.toString().padStart(2, "0")}:00 to ${end
            .toString()
            .padStart(2, "0")}:00`;
        }
        return `${start} to ${end}`;
      }
      return value;
    }

    if (value.includes(",")) {
      const values: number[] = value
        .split(",")
        .map(Number)
        .filter((n: number): boolean => !Number.isNaN(n));
      if (values.length > 0) {
        if (type === "hour") {
          return values
            .map((v: number): string => `${v.toString().padStart(2, "0")}:00`)
            .join(", ");
        }
        if (type === "weekday" && values.length <= 7) {
          const dayNames: string[] = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];
          const dayLabels: string[] = values.map(
            (v: number): string => dayNames[v] || v.toString()
          );
          return dayLabels.join(", ");
        }
        return values.join(", ");
      }
      return value;
    }

    const num: number = Number.parseInt(value, 10);
    if (!Number.isNaN(num)) {
      if (type === "hour") {
        return `${num.toString().padStart(2, "0")}:00`;
      }
      if (type === "weekday") {
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        return dayNames[num] || num.toString();
      }
      if (type === "month") {
        const monthNames: string[] = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        return monthNames[num - 1] || num.toString();
      }
      return num.toString();
    }

    return value;
  };

  const minuteStr: string = parseCronValue(minute, "minute");
  const hourStr: string = parseCronValue(hour, "hour");
  const dayStr: string = parseCronValue(day, "day");
  const monthStr: string = parseCronValue(month, "month");
  const weekdayStr: string = parseCronValue(weekday, "weekday");

  const descriptionParts: string[] = [];

  if (
    minute === "*" &&
    hour === "*" &&
    day === "*" &&
    month === "*" &&
    weekday === "*"
  ) {
    return "Every minute";
  }

  if (
    minute !== "*" &&
    hour !== "*" &&
    day === "*" &&
    month === "*" &&
    weekday === "*"
  ) {
    const min: number = Number.parseInt(minute, 10);
    const hr: number = Number.parseInt(hour, 10);
    if (!Number.isNaN(min) && !Number.isNaN(hr)) {
      const timeStr = `${hr.toString().padStart(2, "0")}:${min
        .toString()
        .padStart(2, "0")}`;
      return `Every day at ${timeStr}`;
    }
  }

  if (
    minute.includes("/") &&
    hour === "*" &&
    day === "*" &&
    month === "*" &&
    weekday === "*"
  ) {
    const [, step] = minute.split("/");
    const stepNum: number = Number.parseInt(step, 10);
    if (!Number.isNaN(stepNum)) {
      return `Every ${stepNum} minute${stepNum > 1 ? "s" : ""}`;
    }
  }

  if (
    minute === "0" &&
    hour.includes("/") &&
    day === "*" &&
    month === "*" &&
    weekday === "*"
  ) {
    const [, step] = hour.split("/");
    const stepNum: number = Number.parseInt(step, 10);
    if (!Number.isNaN(stepNum)) {
      return `Every ${stepNum} hour${stepNum > 1 ? "s" : ""}`;
    }
  }

  if (minute !== "*") {
    if (hour === "*") {
      descriptionParts.push(
        `at ${minuteStr} minute${
          minute.includes(",") || minute.includes("-") ? "s" : ""
        }`
      );
    } else {
      const min: number = Number.parseInt(minute, 10);
      const hr: number = Number.parseInt(hour, 10);
      if (!Number.isNaN(min) && !Number.isNaN(hr)) {
        const timeStr = `${hr.toString().padStart(2, "0")}:${min
          .toString()
          .padStart(2, "0")}`;
        descriptionParts.push(`at ${timeStr}`);
      } else {
        descriptionParts.push(
          `at ${minuteStr} minute${
            minute.includes(",") || minute.includes("-") ? "s" : ""
          }`
        );
        if (hourStr !== "every") {
          descriptionParts.push(hourStr);
        }
      }
    }
  } else if (hour !== "*") {
    descriptionParts.push(`at ${hourStr}`);
  }

  if (day !== "*") {
    if (day === "1") {
      descriptionParts.push("on the 1st");
    } else if (day === "2") {
      descriptionParts.push("on the 2nd");
    } else if (day === "3") {
      descriptionParts.push("on the 3rd");
    } else {
      const dayMatch: RegExpExecArray | null = /^\d+$/.exec(day);
      if (dayMatch) {
        const dayNum: number = Number.parseInt(day, 10);
        const suffix: "th" | "st" | "nd" | "rd" =
          dayNum === 11 || dayNum === 12 || dayNum === 13
            ? "th"
            : dayNum % 10 === 1
            ? "st"
            : dayNum % 10 === 2
            ? "nd"
            : dayNum % 10 === 3
            ? "rd"
            : "th";
        descriptionParts.push(`on the ${dayNum}${suffix}`);
      } else {
        descriptionParts.push(`on day ${dayStr}`);
      }
    }
  }

  if (month !== "*") {
    descriptionParts.push(`in ${monthStr}`);
  }

  if (weekday !== "*") {
    if (weekday === "1-5" || weekday === "1,2,3,4,5") {
      descriptionParts.push("on weekdays");
    } else if (
      weekday === "0,6" ||
      weekday === "6,0" ||
      weekday === "0-6" ||
      weekday === "6-0"
    ) {
      descriptionParts.push("on weekends");
    } else {
      descriptionParts.push(`on ${weekdayStr}`);
    }
  }

  let result: string = "";

  if (minute === "*" && hour === "*") {
    if (day === "*" && month === "*" && weekday === "*") {
      result = "Every minute";
    } else {
      result = "Every day";
    }
  } else if (minute.includes("/") && hour === "*") {
    const [, step] = minute.split("/");
    result = `Every ${step} minute${Number.parseInt(step, 10) > 1 ? "s" : ""}`;
  } else if (minute === "0" && hour.includes("/")) {
    const [, step] = hour.split("/");
    result = `Every ${step} hour${Number.parseInt(step, 10) > 1 ? "s" : ""}`;
  } else if (day.includes("/") && month === "*") {
    const [, step] = day.split("/");
    result = `Every ${step} day${Number.parseInt(step, 10) > 1 ? "s" : ""}`;
  } else if (month !== "*" && day === "*" && weekday === "*") {
    result = "Monthly";
  } else if (weekday !== "*" && day === "*" && month === "*") {
    result = "Weekly";
  } else if (day !== "*" && month !== "*") {
    result = "Yearly";
  } else {
    result = "Daily";
  }

  const details: string = descriptionParts.filter(Boolean).join(" ");
  if (details) {
    result += ` ${details}`;
  }

  result = result.trim();
  if (result === "Every") {
    result = cronExpression;
  }

  return result;
}
