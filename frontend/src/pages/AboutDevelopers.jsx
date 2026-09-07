import { motion } from "framer-motion";

const TEAM = [
  {
    name: "Vikrant K. Kadam",
    linkedin: "https://linkedin.com/in/vikrantkadam028/",
    github: "https://github.com/VikrantKadam028",
    photo:
      "https://media.licdn.com/dms/image/v2/D4D03AQESIR9c5L1XLA/profile-displayphoto-scale_400_400/B4DZ8E_5OrGwAk-/0/1782495287789?e=1790208000&v=beta&t=gWOA3iGPYT_C_8lEnUVOtZKKJ4c1XWFSx081JJhpzMk",
    quote:
      "Every system we build is a promise to the people who trust it — I'd rather over-engineer the guarantee than under-deliver on it.",
  },
  {
    name: "Kartik Pagariya",
    linkedin: "https://www.linkedin.com/in/kartikpagariya1911/",
    github: "https://github.com/kartikpagariya25",
    photo:
      "https://media.licdn.com/dms/image/v2/D4E03AQHfIoFibBhVIA/profile-displayphoto-crop_800_800/B4EZqwcW3eKUAI-/0/1763896816275?e=1790208000&v=beta&t=qhM4SWwE-0WsnL9jFS8wPskQwHB_UivH7tPznjbzEDU",
    quote:
      "Proof beats promise. If a claim can't be verified, it's just marketing — that's the whole reason ZKredit exists.",
  },
  {
    name: "Aditya D. Dengale",
    linkedin: "https://www.linkedin.com/in/adityadengale/",
    github: "https://github.com/DevXDividends",
    photo:
      "https://media.licdn.com/dms/image/v2/D4D03AQEn0yj5zoQwHg/profile-displayphoto-crop_800_800/B4DZjHJmYJH0AM-/0/1755687840857?e=1790208000&v=beta&t=PuSgkFXGYMNt2eb6GCukzn8AR1XSTAHT_V_wdap0-YQ",
    quote:
      "Fairness isn't a feature you bolt on at the end — it has to be measured at every layer, or it isn't real.",
  },
  {
    name: "Pranali D. Yelavikar",
    linkedin: "https://www.linkedin.com/in/pranali-yelavikar-2b3178383/",
    github: "https://github.com/pranaliyelavikar14",
    photo:
      "https://media.licdn.com/dms/image/v2/D4D03AQGPWm01WRkKtw/profile-displayphoto-crop_800_800/B4DZ9fRdCqJwAM-/0/1784009840442?e=1790208000&v=beta&t=YwO7HJSxg9IFq6xJLJxRXCbbBmGdkC82PCmapKP_23I",
    quote:
      "The best infrastructure is invisible — good architecture is judged by how little anyone has to think about it later.",
  },
];

function LinkedInIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

function GitHubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.48 2 2 6.58 2 12.19c0 4.49 2.87 8.3 6.84 9.65.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.88-2.78.6-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.55 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.79-4.58 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.2 10.2 0 0 0 22 12.19C22 6.58 17.52 2 12 2z"
      />
    </svg>
  );
}

function TeamCard({ member, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="border border-ink-border rounded-2xl p-6 bg-ink-surface flex flex-col items-center text-center hover:border-accent/40 transition-colors"
    >
      <div className="w-24 h-24 rounded-full overflow-hidden border border-ink-border mb-4 bg-ink shrink-0">
        <img src={member.photo} alt={member.name} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <h3 className="font-display text-lg text-paper mb-1">{member.name}</h3>
      <p className="text-xs text-paper-dim font-mono uppercase tracking-widest mb-4">
        TY &middot; AI &amp; Data Science &middot; VIT Pune
      </p>
      <p className="text-sm text-paper-muted italic leading-relaxed mb-6">&ldquo;{member.quote}&rdquo;</p>
      <div className="flex items-center gap-3 mt-auto">
        <a
          href={member.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${member.name} on LinkedIn`}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-border text-paper-muted hover:text-accent hover:border-accent/40 transition-colors"
        >
          <LinkedInIcon className="w-4 h-4" />
        </a>
        <a
          href={member.github}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${member.name} on GitHub`}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-border text-paper-muted hover:text-accent hover:border-accent/40 transition-colors"
        >
          <GitHubIcon className="w-4 h-4" />
        </a>
      </div>
    </motion.div>
  );
}

export default function AboutDevelopers() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="font-mono text-xs text-paper-muted tracking-widest uppercase mb-3">Behind ZKredit</div>
      <h1 className="font-display text-3xl text-paper mb-3">About the Developers</h1>
      <p className="text-paper-muted mb-12 max-w-2xl">
        ZKredit is built by a team of final-year AI &amp; Data Science students at Vishwakarma Institute of
        Technology, Pune, as an exploration of provable, privacy-preserving lending infrastructure.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {TEAM.map((member, i) => (
          <TeamCard key={member.name} member={member} index={i} />
        ))}
      </div>
    </div>
  );
}