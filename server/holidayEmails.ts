// Pure drafts: these helpers never send messages or contact an email provider.
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );
function secureUrl(value: string) {
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password)
    throw new Error("Lien HTTPS requis");
  return u;
}
function draft(subject: string, text: string) {
  return {
    subject,
    text,
    html: `<div lang="fr" style="font-family:Arial,sans-serif;color:#001a3d;max-width:620px;line-height:1.6">${text
      .split("\n\n")
      .map(p => `<p>${escape(p).replace(/\n/g, "<br>")}</p>`)
      .join("")}</div>`,
  };
}
export function holidayInvitationEmail(
  businessName: string,
  privateLink: string
) {
  const u = secureUrl(privateLink);
  if (
    !["www.synergiedour.be", "synergiedour.be"].includes(u.hostname) ||
    u.pathname !== "/fetes-2026" ||
    !/^#[a-f0-9]{64}$/.test(u.hash)
  )
    throw new Error("Lien privé de campagne invalide");
  const mail = draft(
    "Fêtes 2026 : mettons votre commerce à l’honneur à Dour",
    `Bonjour ${businessName},\n\nPour les fêtes de fin d’année, Synergie Dour prépare une campagne pour mettre ses commerçants adhérents en lumière.\n\nPartagez vos photos, vidéos, menus, idées cadeaux et offres de fêtes via votre fiche personnelle :\n${u.href}\n\nVous pouvez enregistrer votre fiche et revenir la compléter. Gardez ce lien privé : il donne accès à votre dossier.\n\nÀ partir de vos éléments et avec votre autorisation de diffusion, nous préparerons une vidéo festive avec voix off et une publication adaptée à votre commerce. Julien ou Olivier les validera avant diffusion.\n\nAprès publication, vous recevrez le lien pour repartager le post et identifier deux commerces de Dour de votre choix.\n\nUne question ? Répondez à cet email ou contactez info@synergiedour.be.\n\nL’équipe Synergie Dour\nCommerçants & indépendants réunis`
  );
  mail.html = mail.html.replace(
    escape(u.href),
    `<a href="${escape(u.href)}">Compléter ma fiche pour les fêtes</a>`
  );
  return mail;
}
export function holidayPublishedEmail(businessName: string, postUrl: string) {
  const u = secureUrl(postUrl);
  if (
    ![
      "www.facebook.com",
      "facebook.com",
      "www.instagram.com",
      "instagram.com",
    ].includes(u.hostname)
  )
    throw new Error("Lien de publication sociale invalide");
  const mail = draft(
    `${businessName} : votre publication Synergie Dour est en ligne !`,
    `Bonjour ${businessName},\n\nVotre commerce est à l’honneur sur les réseaux de Synergie Dour !\n\nDécouvrez votre publication :\n${u.href}\n\nPour lui donner encore plus de visibilité, repartagez le post depuis la publication d’origine, sur votre page ou en story selon les possibilités de la plateforme.\n\nVous pouvez aussi identifier deux commerces de Dour de votre choix pour faire vivre cette belle dynamique locale.\n\nMerci de faire rayonner le commerce local avec nous !\n\nL’équipe Synergie Dour\nCommerçants & indépendants réunis\n\nUne correction ou une demande de retrait ? Écrivez à info@synergiedour.be.`
  );
  mail.html = mail.html.replace(
    escape(u.href),
    `<a href="${escape(u.href)}">Voir et repartager ma publication</a>`
  );
  return mail;
}

export function holidaySubmissionEmail(businessName: string, appUrl: string) {
  const base = secureUrl(appUrl);
  if (!["www.synergiedour.be", "synergiedour.be"].includes(base.hostname))
    throw new Error("Adresse de campagne invalide");
  const link = new URL("/dashboard/fetes-2026", base).href;
  const name = businessName.replace(/[\r\n]/g, " ");
  const mail = draft(
    `Fêtes 2026 : nouveau dossier — ${name}`,
    `Bonjour,\n\nLe commerce « ${name} » vient de transmettre sa fiche pour la campagne des fêtes 2026.\n\nConsultez ses informations et ses fichiers dans le tableau de bord sécurisé :\n${link}\n\nVérifiez l’adhésion et les éléments transmis avant la production. Aucune publication n’a été déclenchée.\n\nSynergie Dour\nCommerçants & indépendants réunis`
  );
  mail.html = mail.html.replace(
    escape(link),
    `<a href="${escape(link)}">Consulter les dossiers reçus</a>`
  );
  return mail;
}

export function holidayCustomerReceiptEmail(
  businessName: string,
  contactName: string,
  privateLink: string
) {
  const u = secureUrl(privateLink);
  if (
    !["www.synergiedour.be", "synergiedour.be"].includes(u.hostname) ||
    u.pathname !== "/fetes-2026" ||
    !/^#[a-f0-9]{64}$/.test(u.hash)
  )
    throw new Error("Lien privé de campagne invalide");
  const mail = draft(
    `Votre fiche Fêtes 2026 est bien enregistrée — ${businessName.replace(/[\r\n]/g, " ")}`,
    `Bonjour ${contactName},\n\nNous avons bien reçu la fiche de votre commerce « ${businessName} » pour la campagne des fêtes 2026 de Synergie Dour.\n\nConservez votre lien personnel pour consulter et compléter vos informations, photos, vidéos, menus et offres :\n${u.href}\n\nCe lien donne accès à votre dossier : gardez-le privé et ne le partagez pas sur les réseaux sociaux.\n\nL’équipe vérifiera votre adhésion et les éléments transmis avant la promotion de votre commerce. Cet email confirme l’enregistrement de votre fiche ; il ne confirme pas une publication.\n\nUne question ? Répondez à cet email ou écrivez à contact@synergiedour.be.\n\nL’équipe Synergie Dour\nCommerçants & indépendants réunis`
  );
  mail.html = mail.html.replace(
    escape(u.href),
    `<a href="${escape(u.href)}">Retrouver et compléter ma fiche</a>`
  );
  return mail;
}

export function holidayReviewEmail(businessName: string) {
  const link = "https://www.synergiedour.be/dashboard/fetes-2026";
  const mail = draft(
    `Vidéo Fêtes 2026 à valider — ${businessName.replace(/[\r\n]/g, " ")}`,
    `Bonjour,\n\nLa vidéo festive du commerce « ${businessName} » et son texte sont prêts pour votre relecture :\n${link}\n\nRegardez la vidéo complète avec le son, puis vérifiez les informations et le texte. Une validation de Julien OU Olivier autorise la publication automatique sur la page Facebook Synergie Dour.\n\nSans cet accord, aucune publication n’est déclenchée.\n\nL’équipe Synergie Dour`
  );
  mail.html = mail.html.replace(
    escape(link),
    `<a href="${link}">Voir et valider la vidéo</a>`
  );
  return mail;
}
