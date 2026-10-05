const { createClient } = require("@supabase/supabase-js");

const outcomes = [
  "KSh 50 OFF",
  "KSh 75 OFF",
  "KSh 85 OFF",
  "KSh 100 OFF",
  "KSh 150 OFF",
  "FREE DELIVERY",
  "SORRY, NEXT TIME"
];

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  // Check that Vercel can see the environment variables
  if (!process.env.SUPABASE_URL) {
    return res.status(500).json({
      error: "SUPABASE_URL is missing in Vercel."
    });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: "SUPABASE_SERVICE_ROLE_KEY is missing in Vercel."
    });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const code = String(req.body?.code || "")
      .trim()
      .toUpperCase();

    if (!code) {
      return res.status(400).json({
        error: "Please enter your unique code."
      });
    }

    // Find the unused code
    const {
      data: codeRow,
      error: findError
    } = await supabase
      .from("spin_codes")
      .select("id, code, status")
      .eq("code", code)
      .eq("status", "unused")
      .maybeSingle();

    if (findError) {
      console.error("SUPABASE FIND ERROR:", findError);

      return res.status(500).json({
        error: "Supabase error: " + findError.message
      });
    }

    if (!codeRow) {
      return res.status(400).json({
        error: "Invalid or already used code."
      });
    }

    // Choose a random prize
    const resultId =
      Math.floor(Math.random() * outcomes.length);

    const result = outcomes[resultId];

    // Mark the code as used and save the result
    const {
      data: updatedRows,
      error: updateError
    } = await supabase
      .from("spin_codes")
      .update({
        status: "used",
        result: result,
        result_id: String(resultId),
        used_at: new Date().toISOString()
      })
      .eq("id", codeRow.id)
      .eq("status", "unused")
      .select("id");

    if (updateError) {
      console.error("SUPABASE UPDATE ERROR:", updateError);

      return res.status(500).json({
        error: "Supabase update error: " + updateError.message
      });
    }

    if (!updatedRows || updatedRows.length !== 1) {
      return res.status(409).json({
        error: "This code has already been used."
      });
    }

    return res.status(200).json({
      result: result,
      resultId: resultId
    });

  } catch (error) {
    console.error("BACKEND ERROR:", error);

    return res.status(500).json({
      error: "Backend error: " + error.message
    });
  }
};
