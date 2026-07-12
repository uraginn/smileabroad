export const TREATMENTS = [
  "Dental Implants",
  "All-on-4",
  "All-on-6",
  "Veneers",
  "Crowns",
  "Bridges",
  "Root Canal",
  "Teeth Whitening",
  "Composite Bonding",
  "Full Mouth Rehabilitation",
  "Orthodontics",
  "Dentures",
];

export const COUNTRIES = [
  "Turkey",
  "Hungary",
  "Mexico",
  "Spain",
  "Poland",
  "Thailand",
  "Colombia",
  "Portugal",
];

export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  Turkey: ["Istanbul", "Antalya", "Izmir", "Ankara"],
  Hungary: ["Budapest", "Sopron", "Debrecen"],
  Mexico: ["Cancún", "Los Algodones", "Tijuana", "Mexico City"],
  Spain: ["Madrid", "Barcelona", "Valencia"],
  Poland: ["Warsaw", "Kraków", "Wroclaw"],
  Thailand: ["Bangkok", "Phuket", "Chiang Mai"],
  Colombia: ["Bogotá", "Medellín", "Cartagena"],
  Portugal: ["Lisbon", "Porto"],
};

export const LEAD_STATUSES = [
  { value: "new_lead", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "awaiting_images", label: "Awaiting Images" },
  { value: "doctor_review", label: "Doctor Review" },
  { value: "treatment_planning", label: "Treatment Planning" },
  { value: "quote_sent", label: "Plan Sent" },
  { value: "follow_up", label: "Follow-up" },
  { value: "negotiation", label: "Negotiation" },
  { value: "booked", label: "Booked" },
  { value: "treatment_started", label: "Treatment Started" },
  { value: "completed", label: "Completed" },
  { value: "lost", label: "Lost" },
] as const;
