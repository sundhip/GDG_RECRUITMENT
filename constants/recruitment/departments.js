import {
  Hub,
  SportsEsports,
  Mobile2,
  DesignServices,
  Analytics,
  Trophy,
  Language,
  Cloud,
} from "@material-symbols-svg/react/outlined";

/**
 * 8 Official Technical Departments for GDG on Campus · VIT Chennai
 * Technical Recruitment 2026.
 */
export const DEPARTMENTS = [
  {
    id: "6a89c4e2-7b19-4f32-821e-9821a41b5201",
    name: "Blockchain",
    slug: "blockchain",
    shortDescription: "Build and explore decentralized applications, smart contracts and Web3 technologies.",
    description:
      "Explore decentralized technologies, smart contracts and Web3 by building practical applications and understanding how blockchain systems work.",
    beginnerNote: "You do not need prior blockchain experience. Curiosity about how decentralized systems work is enough to start.",
    color: "#F4B400",
    bgColor: "bg-[#F4B400]",
    bgHover: "hover:bg-[#E5A800]",
    iconSrc: "/assets/images/icons/blockchain.svg",
    icon: Hub,
    aliases: ["∫_BkY2C_xu", "blockchain", "Web3"],
  },
  {
    id: "9055864f-c7dc-44cd-91d5-8759d32a496a",
    name: "Game Development",
    slug: "game-development",
    shortDescription: "Build games, experiment with mechanics and turn ideas into playable experiences.",
    description:
      "Turn ideas into interactive experiences by exploring game mechanics, programming, game engines, prototyping and player experience.",
    beginnerNote: "Prior game development experience is not required. We care about curiosity, creativity and willingness to experiment.",
    color: "#4285F4",
    bgColor: "bg-[#4285F4]",
    bgHover: "hover:bg-[#3367D6]",
    iconSrc: "/assets/images/icons/game-dev.svg",
    icon: SportsEsports,
    aliases: ["Ω_GmF6X_ny", "game development", "Game Dev", "gamedev"],
  },
  {
    id: "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
    name: "App Development",
    slug: "app-development",
    shortDescription: "Build mobile applications that solve real problems for students and communities.",
    description:
      "Build useful mobile experiences by exploring Android and cross-platform development, APIs, application architecture and user-focused design.",
    beginnerNote: "If you have never built an app, eagerness to learn Android/Flutter and UI design is all you need.",
    color: "#EA4335",
    bgColor: "bg-[#EA4335]",
    bgHover: "hover:bg-[#D93025]",
    iconSrc: "/assets/images/icons/app-dev.svg",
    icon: Mobile2,
    aliases: ["∑_ApZ3V_gh", "app development", "App Dev", "android", "flutter"],
  },
  {
    id: "e2ed9c2c-c36c-457f-a8bb-cf2e8bc7c2e1",
    name: "UI/UX",
    slug: "ui-ux",
    shortDescription: "Understand users, solve problems and turn ideas into thoughtful digital experiences.",
    description:
      "Design digital experiences that are useful, accessible and intuitive through research, wireframing, interaction design, prototyping and visual design.",
    beginnerNote: "New to UI/UX? Curiosity about how people use apps and websites is the perfect starting point.",
    color: "#0F9D58",
    bgColor: "bg-[#0F9D58]",
    bgHover: "hover:bg-[#0B8043]",
    iconSrc: "/assets/images/icons/ui-ux.svg",
    icon: DesignServices,
    aliases: ["ø_UxK2_mj", "ui/ux", "UI/UX Design", "Design"],
  },
  {
    id: "c0f3b1d1-ce05-45f6-9e34-ac9443fc5fcb",
    name: "Data Science",
    slug: "data-science",
    shortDescription: "Use data, analysis and machine learning to understand problems and discover useful insights.",
    description:
      "Turn raw data into useful insights through data analysis, visualization, statistics, machine learning and experimentation.",
    beginnerNote: "No advanced ML required — if you like solving puzzles with data and logic, you'll fit right in.",
    color: "#EA4335",
    bgColor: "bg-[#EA4335]",
    bgHover: "hover:bg-[#D93025]",
    iconSrc: "/assets/images/icons/data-science.svg",
    icon: Analytics,
    aliases: ["≈_DtB1S_zk", "data science", "Data Science & AI", "AI/ML"],
  },
  {
    id: "3e9ac635-01d4-495e-aa87-a7335a2403c2",
    name: "Competitive Programming",
    slug: "competitive-programming",
    shortDescription: "Think faster, solve better and strengthen your algorithmic foundations.",
    description:
      "Strengthen problem-solving and algorithmic thinking through data structures, algorithms, contests and collaborative practice.",
    beginnerNote: "You don't need a high rating. An appetite for algorithmic puzzles and practicing DSA is what counts.",
    color: "#0F9D58",
    bgColor: "bg-[#0F9D58]",
    bgHover: "hover:bg-[#0B8043]",
    iconSrc: "/assets/images/icons/cp.svg",
    icon: Trophy,
    aliases: ["≤_CpM8P_rw", "competitive programming", "CP", "DSA"],
  },
  {
    id: "8143de1d-db17-42fa-958d-13b10804f894",
    name: "Web Development",
    slug: "web-development",
    shortDescription: "Build fast, accessible and useful web experiences for the GDG community.",
    description:
      "Build modern web experiences across frontend and backend systems using technologies such as JavaScript, TypeScript, React, APIs, databases and modern web frameworks.",
    beginnerNote: "Whether you just learned HTML/CSS or built full-stack apps, we welcome everyone ready to build.",
    color: "#F4B400",
    bgColor: "bg-[#F4B400]",
    bgHover: "hover:bg-[#E5A800]",
    iconSrc: "/assets/images/icons/web-dev.svg",
    icon: Language,
    aliases: ["µ_Wb₹5D_lp", "web development", "Web Dev", "fullstack"],
  },
  {
    id: "ae7db51a-c6db-4f8d-9159-40767c5354cb",
    name: "Open Source",
    slug: "open-source",
    shortDescription: "Learn to collaborate on real software through open-source development.",
    description:
      "Learn how real software projects are built collaboratively through Git, GitHub, issues, pull requests, code reviews, documentation and community contribution.",
    beginnerNote: "Never made a pull request? We'll teach you Git fundamentals and help you make your first contribution.",
    color: "#4285F4",
    bgColor: "bg-[#4285F4]",
    bgHover: "hover:bg-[#3367D6]",
    iconSrc: "/assets/images/icons/open-source.svg",
    icon: Cloud,
    aliases: ["∂_CdH4D_bv", "open source", "Open Source & Cloud", "GitHub"],
  },
];

/**
 * Helper to find a department by ID, name, or legacy alias.
 */
export function findDepartment(identifier) {
  if (!identifier) return null;
  const clean = String(identifier).trim().toLowerCase();
  return (
    DEPARTMENTS.find(
      (d) =>
        d.id.toLowerCase() === clean ||
        d.name.toLowerCase() === clean ||
        d.slug.toLowerCase() === clean ||
        d.aliases.some((a) => a.toLowerCase() === clean)
    ) || null
  );
}
