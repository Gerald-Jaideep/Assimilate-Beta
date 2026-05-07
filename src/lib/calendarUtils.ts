export function generateICSFile(event: {
  title: string;
  description: string;
  location: string;
  startTime: string;
  duration?: string;
}) {
  const start = new Date(event.startTime);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour

  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Case Presentation Manager//NONSGML v1.0//EN",
    "BEGIN:VEVENT",
    `URL:${window.location.href}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${event.location}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute("download", `${event.title.replace(/\s+/g, "_")}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
