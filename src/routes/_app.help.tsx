import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/_app/help")({
  component: HelpPage,
});

const FAQ = [
  { q: "How do I create a task?", a: "Use the New Task button in the top header or open Work Management and start from a template." },
  { q: "How is the task number generated?", a: "Numbers follow FSS-[CATEGORY]-[ENTITY]-[SEQUENCE], e.g. FSS-MEC-GER-000001. Sequence is per category+entity." },
  { q: "Why can't I see some Settings tabs?", a: "Users, Roles, Entities, Categories and System are restricted to System Admins." },
  { q: "Where is data stored?", a: "In this demo, data is stored locally in your browser. Connect Supabase to persist it across users — see the project README and supabase-schema.sql." },
  { q: "How do I switch themes?", a: "Click the sparkles icon in the header or open Settings → Preferences." },
];

function HelpPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Help</h1>
        <p className="text-sm text-muted-foreground">Documentation and frequently asked questions</p>
      </div>
      <Card><CardContent className="p-5">
        <Accordion type="single" collapsible className="w-full">
          {FAQ.map((f, i) => (
            <AccordionItem key={i} value={`f-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent></Card>
    </div>
  );
}
