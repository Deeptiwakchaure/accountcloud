import type { RequestHandler } from "express";
import fetch from "node-fetch";
import { z } from "zod";

const QSchema = z.object({
  inputText: z.string().min(1),
  selectedType: z.enum(["byCode", "byDesc"]).default("byDesc"),
  category: z.enum(["null", "P", "S"]).default("null"),
});

export const handleHsnSearch: RequestHandler = async (req, res) => {
  try {
    const parsed = QSchema.parse(req.query);
    const url = new URL(
      "https://services.gst.gov.in/commonservices/hsn/search/qsearch",
    );
    url.searchParams.set("inputText", parsed.inputText);
    url.searchParams.set("selectedType", parsed.selectedType);
    url.searchParams.set("category", parsed.category);

    const r = await fetch(url.toString(), { method: "GET" });
    const data = await r.json();
    res.json(data);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Invalid request" });
  }
};
