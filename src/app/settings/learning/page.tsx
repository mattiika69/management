import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

const lessons = [
  {
    number: "01",
    title: "Management Operating System",
    videoUrl: "https://www.youtube.com/embed/ysz5S6PUM-U",
  },
  {
    number: "02",
    title: "Hiring and Role Clarity",
    videoUrl: "https://www.youtube.com/embed/ysz5S6PUM-U",
  },
  {
    number: "03",
    title: "Training Plans and Accountability",
    videoUrl: "https://www.youtube.com/embed/ysz5S6PUM-U",
  },
];

export default async function SettingsLearningPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/learning");
  }

  await getOrCreateDefaultOrganization(supabase, user);

  return (
    <AppShell
      active="/settings/learning"
      title="Learning"
      subtitle="Training library for the management workspace."
      tabs={settingsTabs}
    >
      <section className="settings-page">
        <article className="settings-card grid gap-5 p-4 lg:grid-cols-[235px_minmax(0,1fr)_136px] lg:items-center">
          <div className="grid aspect-[2.05/1] place-items-end overflow-hidden rounded-[5px] bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.88),transparent_18%),linear-gradient(135deg,#f8d64e_0%,#efb921_42%,#101828_100%)] p-5 text-white">
            <div className="w-full">
              <p className="text-[10px] font-black uppercase tracking-[0.16em]">HyperOptimal</p>
              <p className="mt-1 text-[22px] font-black leading-none">Management Learn</p>
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="text-[20px] font-bold text-[#101828]">HyperOptimal Management Library</h2>
            <p className="mt-3 max-w-[680px] text-[13px] font-medium leading-6 text-[#53627a]">
              Master the operating rhythms, hiring handoffs, training plans, and meeting systems that keep the management workspace clean.
            </p>
            <div className="mt-4 h-1.5 max-w-[350px] rounded-full bg-[#edf1f6]" />
            <p className="mt-2 text-[11px] font-semibold text-[#53627a]">0 of {lessons.length} lessons complete</p>
          </div>

          <a
            href="#lesson-1"
            className="inline-flex h-[40px] items-center justify-center gap-4 rounded-[7px] bg-[#f8bd17] px-5 text-[13px] font-black text-[#101828] shadow-sm transition hover:bg-[#f0b10b]"
          >
            Get Started
            <span aria-hidden="true" className="text-[15px] leading-none">&gt;</span>
          </a>
        </article>

        <div className="mt-5 space-y-4">
          {lessons.map((lesson, index) => (
            <article
              id={`lesson-${index + 1}`}
              key={lesson.number}
              className="settings-card grid gap-4 p-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-center"
            >
              <div className="overflow-hidden rounded-[6px] bg-[#101828]">
                <iframe
                  className="aspect-video w-full"
                  src={lesson.videoUrl}
                  title={lesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#98a2b3]">
                  Lesson {lesson.number}
                </p>
                <h3 className="mt-3 text-[18px] font-bold text-[#101828]">{lesson.title}</h3>
                <div className="mt-4 h-1.5 max-w-[380px] rounded-full bg-[#edf1f6]" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
