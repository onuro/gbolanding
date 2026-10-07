import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// The blog: Turkish articles as plain Markdown in src/content/blog/<slug>.md.
// The schema is the article contract written as code, so an article that
// breaks it fails loudly (in the dev overlay and in the build) instead of
// shipping a 200-character description or a slug with Turkish letters in it.
//
// Files whose name starts with an underscore are drafts and scratch files: the
// pattern skips them, so they never reach a page, the sitemap or the feed.

export const blogCategories = ["Yapay zeka", "Strateji", "Sektör", "Teknoloji"] as const;
export const blogProducts = ["kollektor", "intelval", "hastam", "fountible"] as const;

// YAML reads an unquoted 2026-10-07 as a date and a quoted one as a string.
// A source date is shown as written, so both become "YYYY-MM-DD" text; a year
// or a year and month alone is allowed for a source that gives no day.
const sourceDate = z
  .union([
    z.date().transform((date) => date.toISOString().slice(0, 10)),
    z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, "YYYY-MM-DD, YYYY-MM or YYYY"),
  ])
  .optional();

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "[^_]*.md" }),
  schema: z
    .object({
      // The H1. The contract says about 70 characters; 75 leaves room for that
      // "about" without letting a paragraph through.
      title: z.string().trim().min(10).max(75),
      // The <title>: 30 to 60 characters, always ending on the brand.
      seoTitle: z
        .string()
        .trim()
        .min(30)
        .max(60)
        .regex(/ \| GBO Vision$/, 'ends with " | GBO Vision"'),
      description: z.string().trim().min(120).max(158),
      // ASCII kebab case: ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c. The glob loader uses
      // it as the entry id, so it is also the URL: /blog/<slug>.
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "ASCII kebab-case"),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      // Leads the /blog index. Without it the newest article does, and
      // articles published on the same day would fall back to title order.
      featured: z.boolean().optional(),
      category: z.enum(blogCategories),
      tags: z.array(z.string().trim().min(1)).min(1),
      keyword: z.string().trim().min(2),
      relatedProduct: z.enum(blogProducts).nullable(),
      ogImage: z.string().regex(/^\/og\/blog-[a-z0-9-]+\.png$/, "/og/blog-<slug>.png"),
      summary: z.array(z.string().trim().min(1)).min(3).max(5),
      faq: z.array(
        z.object({
          question: z.string().trim().min(1),
          answer: z.string().trim().min(1),
        }),
      ),
      sources: z
        .array(
          z.object({
            title: z.string().trim().min(1),
            publisher: z.string().trim().min(1),
            url: z.url({ protocol: /^https?$/ }),
            date: sourceDate,
          }),
        )
        .min(1),
    })
    .superRefine((data, context) => {
      if (data.ogImage !== `/og/blog-${data.slug}.png`) {
        context.addIssue({
          code: "custom",
          path: ["ogImage"],
          message: `ogImage must be /og/blog-${data.slug}.png`,
        });
      }
      if (data.updatedAt < data.publishedAt) {
        context.addIssue({
          code: "custom",
          path: ["updatedAt"],
          message: "updatedAt is earlier than publishedAt",
        });
      }
    }),
});

export const collections = { blog };
