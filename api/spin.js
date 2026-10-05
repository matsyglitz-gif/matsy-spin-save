const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

  try {
    const code = String(req.body?.code || "")
      .trim()
      .toUpperCase();

    if (!code) {
      return res.status(400).json({
        error: "Please enter your code."
      });
    }

    const { data: codeRow, error: findError } = await supabase
      .from("spin_codes")
      .select("id, code, status")
      .eq("code", code)
      .eq("status", "unused")
      .maybeSingle();

    if (findError) {
  console.error("SUPABASE FIND ERROR:", findError);

  return res.status(500).json({
    error: "Database error: " + findError.message
  });
    }

    if (!codeRow) {
      return res.status(400).json({
        error: "Invalid or already used code."
      });
    }

    const resultId =
      Math.floor(Math.random() * outcomes.length);

    const result = outcomes[resultId];

    const { data: updatedRows, error: updateError } =
      await supabase
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
    error: "Database update error: " + updateError.message
  });
    }

    if (!updatedRows || updatedRows.length !== 1) {
      return res.status(409).json({
        error: "This code has already been used."
      });
    }

    return res.status(200).json({
      result,
      resultId
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
};
