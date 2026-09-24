/**
 * LinkedIn's public «Add license or certification» link: a plain URL that opens the learner's own
 * profile form with the fields pre-filled. No SDK, no script and nothing sent to LinkedIn until
 * the learner saves the form themselves. If LinkedIn ever stops honouring a parameter, the form
 * simply opens with that field empty.
 */
const LINKEDIN_ADD_CERTIFICATION = "https://www.linkedin.com/profile/add";

export function linkedInAddCertificationUrl({
  name,
  organizationName,
  issuedAt,
  certUrl,
  certId,
}: {
  name: string;
  organizationName: string;
  issuedAt: Date;
  certUrl: string;
  certId: string;
}): string {
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name,
    organizationName,
    issueYear: String(issuedAt.getUTCFullYear()),
    issueMonth: String(issuedAt.getUTCMonth() + 1),
    certUrl,
    certId,
  });
  return `${LINKEDIN_ADD_CERTIFICATION}?${params.toString()}`;
}
