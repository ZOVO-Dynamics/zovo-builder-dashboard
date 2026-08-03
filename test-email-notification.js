const RESEND_API_KEY = process.env.RESEND_API_KEY;
const BASE_URL = "https://www.zovo.ca";

async function testRegisterEmail() {
  const testEmail = `zovotest${Date.now()}@mailinator.com`;
  console.log("Test avec:", testEmail);

  // 1. Créer un compte test
  const registerRes = await fetch(`${BASE_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "TestPassword123!",
      name: "Test Notification",
    }),
  });

  const registerData = await registerRes.json();
  console.log("Réponse /api/register:", registerData);

  if (!registerData.success) {
    console.error("Échec de l'inscription, arrêt du test.");
    return;
  }

  // 2. Attendre un peu que l'envoi se propage
  await new Promise((r) => setTimeout(r, 3000));

  // 3. Vérifier les derniers emails envoyés via l'API Resend
  const emailsRes = await fetch("https://api.resend.com/emails", {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  const emailsData = await emailsRes.json();

  const match = emailsData.data?.find((e) => e.to?.includes(testEmail));

  if (match) {
    console.log("✅ Email trouvé — statut:", match.last_event);
    console.log("   ID:", match.id, "| Sujet:", match.subject);
  } else {
    console.warn("⚠️ Aucun email trouvé pour cette adresse dans Resend.");
  }

  console.log(`\nConsulte aussi: https://www.mailinator.com/v4/public/inboxes.jsp?to=${testEmail.split("@")[0]}`);
}

testRegisterEmail().catch(console.error);
