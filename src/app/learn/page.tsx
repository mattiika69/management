import Link from "next/link";

const navItems = [
  { label: "Brainstorm", active: false, icon: "spark" },
  { label: "Ideas", active: false, icon: "list" },
  { label: "Analyze", active: false, icon: "video" },
  { label: "Edit (Beta)", active: false, icon: "wand" },
  { label: "Learn", active: true, icon: "cap" },
];

const courses = [
  {
    title: "The HyperOptimal Library",
    description:
      "Master the most effective video formats on social media. Each lesson breaks down a proven format with examples and actionable tips.",
    lessons: 60,
    image: "library",
  },
  {
    title: "The TikTok and Reels Creator Course",
    description:
      "Everything you need to build a following and create viral content on TikTok, Instagram Reels, and YouTube Shorts.",
    lessons: 23,
    image: "reels",
  },
  {
    title: "The Art of Hooks Creator Course",
    description:
      "It doesn't matter how good your content is if nobody watches past the first few seconds. Master verbal, text, visual, caption, and audio hooks.",
    lessons: 7,
    image: "hooks",
  },
  {
    title: "Comfy on Cam",
    description:
      "Build your on-camera confidence so you can start creating more compelling video content. Whether you're creating for your personal brand, business, or team.",
    lessons: 12,
    image: "camera",
  },
];

function Icon({ name }: { name: string }) {
  if (name === "cap") {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m3 9 9-4 9 4-9 4-9-4Z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 11v5c2.8 2 7.2 2 10 0v-5" />
      </svg>
    );
  }
  if (name === "spark") {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 18h6M10 22h4M8.5 14.5A6 6 0 1 1 15.5 14c-.9.8-1.5 1.6-1.5 3h-4c0-1.2-.4-1.8-1.5-2.5Z" />
      </svg>
    );
  }
  if (name === "list") {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect width="15" height="17" x="5" y="4" rx="2" strokeWidth={1.8} />
        <path strokeLinecap="round" strokeWidth={1.8} d="M9 9h6M9 13h6M9 17h4M9 2v4M16 2v4" />
      </svg>
    );
  }
  if (name === "video") {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect width="13" height="10" x="3" y="7" rx="2" strokeWidth={1.8} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m16 10 5-3v10l-5-3" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m15 4 5 5M14 5l-9 9-1 5 5-1 9-9M4 4l2 2M19 16l2 2M12 2v3M2 12h3" />
    </svg>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2 text-white">
      <div className="grid grid-cols-2 gap-[4px]">
        <span className="h-[18px] w-[18px] rounded-full border-[3px] border-white" />
        <span className="h-[18px] w-[18px] border-[3px] border-white" />
        <span className="h-[18px] w-[18px] rotate-45 border-[3px] border-white" />
        <span className="h-[18px] w-[18px] rounded-[3px] border-[3px] border-white" />
      </div>
      <div className="text-[29px] font-black uppercase leading-[0.84] tracking-[-0.02em]">
        <p>Hyper</p>
        <p>Optimal</p>
      </div>
    </div>
  );
}

function CourseImage({ kind }: { kind: string }) {
  if (kind === "library") {
    return (
      <div className="relative h-[126px] w-[207px] overflow-hidden bg-[#f4f0e9]">
        <div className="absolute inset-0 grid grid-cols-4 gap-1 opacity-25">
          {Array.from({ length: 16 }).map((_, index) => (
            <span key={index} className="bg-[linear-gradient(135deg,#d5d9de,#fff,#b9c0c8)]" />
          ))}
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-[31px] font-black uppercase leading-[0.82] text-gray-950">Hyper</p>
            <p className="text-[31px] font-black uppercase leading-[0.82] text-gray-950">Optimal</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.45em] text-gray-800">Library</p>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "reels") {
    return (
      <div className="relative h-[104px] w-[207px] overflow-hidden rounded-[2px] bg-[#f2c313]">
        <div className="absolute left-4 top-6 max-w-[110px] font-serif text-[17px] font-black leading-[0.96] text-black">
          The TikTok & Reels Creator Course
        </div>
        <div className="absolute right-6 top-3 h-[90px] w-[53px] rounded-[8px] border-[5px] border-white bg-gray-950 shadow-lg">
          <div className="grid h-full grid-cols-2 gap-[2px] p-[3px]">
            {Array.from({ length: 8 }).map((_, index) => (
              <span key={index} className="bg-[linear-gradient(135deg,#f97316,#e5e7eb,#111827)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (kind === "hooks") {
    return (
      <div className="relative h-[126px] w-[207px] overflow-hidden bg-white">
        <div className="absolute left-0 top-0 h-full w-[118px] bg-white px-3 pt-42">
          <p className="mt-12 font-serif text-[19px] font-black leading-[0.92] text-black">The Art of Hooks</p>
          <p className="font-serif text-[15px] font-bold leading-none text-black">Creator Course</p>
        </div>
        <div className="absolute right-1 top-0 h-full w-[104px] rotate-[-8deg] bg-[#f2c313]">
          <div className="grid grid-cols-2 gap-2 p-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <span key={index} className="h-[42px] rounded-[6px] bg-white shadow-sm" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[126px] w-[207px] overflow-hidden bg-gray-950">
      <div className="absolute left-7 top-0 h-[30px] w-[20px] bg-[#f2c313]" />
      <div className="absolute bottom-8 left-6 -rotate-6 text-[30px] font-black italic leading-[0.85] text-white">
        COMFY
        <br />
        ON CAM
      </div>
      <div className="absolute right-5 top-4 h-[95px] w-[55px] rounded-[11px] border-[4px] border-white bg-gray-200">
        <div className="grid h-full grid-cols-1 gap-[2px] p-[4px]">
          <span className="rounded bg-[linear-gradient(135deg,#f59e0b,#fce7f3)]" />
          <span className="rounded bg-[linear-gradient(135deg,#38bdf8,#fde68a)]" />
        </div>
      </div>
    </div>
  );
}

function ProgressLine({ lessons }: { lessons: number }) {
  return (
    <div>
      <div className="mb-2 h-[7px] w-[320px] max-w-full rounded-full bg-slate-100" />
      <p className="text-[13px] text-[#536987]">0 of {lessons} lessons complete</p>
    </div>
  );
}

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#111827]">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-[280px] flex-col rounded-r-[14px] bg-[#18181b] text-white shadow-[12px_0_30px_rgba(15,23,42,0.10)]">
        <div className="flex h-[122px] items-center justify-between border-b border-white/10 px-7">
          <BrandMark />
          <button
            type="button"
            className="grid h-[18px] w-[18px] place-items-center rounded-[3px] border border-white/50 text-[10px] text-white/70"
            aria-label="Collapse sidebar"
          >
            ‹
          </button>
        </div>
        <nav className="flex-1 px-5 pt-5">
          <div className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.active ? "/learn" : "#"}
                className={`flex h-[45px] items-center gap-4 rounded-[8px] px-4 text-[16px] font-medium ${
                  item.active
                    ? "bg-[#454548] text-white"
                    : "text-[#e4e4e7] hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <div className="mb-4 flex items-center gap-3 px-4 text-[14px] text-[#e4e4e7]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m3 9 9-4 9 4-9 4-9-4Z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 11v5c2.8 2 7.2 2 10 0v-5" />
            </svg>
            Made with HyperOptimal
          </div>
          <div className="mb-5 flex h-[39px] items-center justify-between border-y border-white/10 px-4 text-[13px] text-[#e4e4e7]">
            <span className="flex items-center gap-2">
              <span className="text-[#f5c21b]">☼</span>
              Beta · Found a bug?
            </span>
            <button type="button" className="h-[25px] rounded-[7px] bg-[#f5c21b] px-3 text-[12px] font-bold text-black">
              Report
            </button>
          </div>
          <div className="flex items-center gap-3 px-4">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e9eef7] text-[13px] font-semibold text-[#223047]">
              M
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-white">Matt</p>
              <p className="truncate text-[13px] text-[#a9b2c1]">matt@1000xleads.com</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="ml-[280px] min-h-screen">
        <div className="flex h-[72px] items-center bg-[linear-gradient(100deg,#17130c_0%,#3a2b0d_36%,#7b2d0e_100%)] px-8 text-white">
          <div className="flex flex-1 items-center justify-center gap-2 text-[15px] font-semibold">
            <span className="text-[#f9d84a]">▱</span>
            Free Live Masterclass
          </div>
          <button type="button" className="mr-[292px] h-[35px] rounded-full bg-[#ffdd3d] px-5 text-[13px] font-bold text-black">
            Learn More&nbsp; →
          </button>
          <button type="button" className="text-[22px] text-white/75" aria-label="Close">
            ×
          </button>
        </div>

        <div className="flex h-[46px] items-center border-b border-[#f1df9d] bg-[#fffbe7] px-[180px] text-[14px] text-[#8a5218]">
          <span className="mr-2 text-[17px]">✉</span>
          <span>
            Please verify your email address. Check your inbox for the verification link.{" "}
            <button type="button" className="font-medium underline underline-offset-2">
              Resend email
            </button>
          </span>
          <button type="button" className="ml-auto text-[22px] text-[#d89b00]" aria-label="Dismiss">
            ×
          </button>
        </div>

        <header className="h-[103px] bg-white px-4">
          <div className="mx-auto flex h-full max-w-[1308px] flex-col justify-center">
            <h1 className="text-[27px] font-bold tracking-[-0.01em] text-gray-950">Learn</h1>
            <p className="mt-2 text-[14px] text-[#4b5563]">Master content creation with our video courses.</p>
          </div>
        </header>

        <section className="border-t border-gray-100 px-4 pb-16 pt-[34px]">
          <div className="mx-auto max-w-[1026px] space-y-3">
            {courses.map((course) => (
              <article
                key={course.title}
                className="grid min-h-[192px] grid-cols-[220px_minmax(0,1fr)_150px] items-center gap-7 rounded-[15px] bg-white px-6 py-7 shadow-[0_2px_8px_rgba(15,23,42,0.12)]"
              >
                <CourseImage kind={course.image} />
                <div className="min-w-0">
                  <h2 className="mb-2 text-[20px] font-bold tracking-[-0.01em] text-gray-950">{course.title}</h2>
                  <p className="mb-3 max-w-[630px] text-[15px] leading-[1.45] text-[#536987]">{course.description}</p>
                  <ProgressLine lessons={course.lessons} />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="h-[37px] rounded-[8px] bg-[#f7bf19] px-5 text-[14px] font-bold text-black shadow-sm"
                  >
                    Get Started&nbsp;&nbsp;›
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
