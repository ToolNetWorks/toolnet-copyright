/** A user-provided template. Statements require affirmative admin confirmation. */
export const COPYRIGHT_DECLARATION_TEMPLATE = `DECLARATION OF COPYRIGHT OWNERSHIP

I, copyright-toolnet, confirm and declare, under penalty of perjury, that I am the sole and lawful copyright owner and the original author of the photographs and images identified in this declaration.

COPYRIGHT OWNER: copyright-toolnet
AUTHOR / CREATOR: copyright-toolnet
DATE OF CREATION / PRODUCTION: DD/MM/YYYY
TITLE / DESCRIPTION OF WORK: Original Photo Collection
TYPE OF COPYRIGHTED WORK: Original Photograph / Photographic Work
COUNTRY OF CREATION: Japan

The copyrighted images identified above were independently created, produced, and/or photographed by me through my own creative effort, skill, and intellectual contribution.

I am the original author and exclusive copyright owner of these works and hold all rights, title, and interest in the copyrighted material.

My exclusive rights include, but are not limited to, the right to reproduce, publish, distribute, display, communicate, modify, adapt, license, authorize, and control the use of the copyrighted images. The complete collection of images referred to in this declaration is owned by me.

Each image was created on or about the date specified in my records, and I maintain supporting evidence proving my authorship and ownership, including original files, source files, project files, creative records, timestamps, metadata, camera or device records, editing history, publication history, and other documentation demonstrating the authenticity and uniqueness of my work. No individual, organization, company, or third party has been granted by me any ownership right, authorization, license, or consent to copy, reproduce, download, upload, publish, distribute, display, modify, adapt, commercially exploit, or use any of these copyrighted images without my express written permission. Any unauthorized use, copying, reproduction, redistribution, publication, public display, adaptation, modification, or commercial exploitation of these images constitutes infringement of my exclusive copyright and intellectual property rights under applicable copyright and intellectual property laws.

I respectfully request that any content using my copyrighted images without my permission be removed immediately and that appropriate measures be taken to prevent any unauthorized use, copying, or distribution of my intellectual property.

I confirm, under penalty of perjury, that the information contained in this declaration is true, accurate, and complete to the best of my knowledge and belief.

EMAIL: toolnet.official@gmail.com
COPYRIGHT OWNER: copyright-toolnet
AUTHOR / CREATOR: copyright-toolnet
DATE OF DECLARATION: DD/MM/YYYY
SIGNATURE: copyright-toolnet`;

// A chosen origin date is a *claim*. The legal declaration is made on submission.
export function formatDeclarationDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid declaration date');
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(parsed);
}

export function buildTumblrDeclaration(createdAt: string, declaredAt: string): string {
  return COPYRIGHT_DECLARATION_TEMPLATE
    .replace('DATE OF CREATION / PRODUCTION: DD/MM/YYYY', `DATE OF CREATION / PRODUCTION: ${formatDeclarationDate(createdAt)}`)
    .replace('DATE OF DECLARATION: DD/MM/YYYY', `DATE OF DECLARATION: ${formatDeclarationDate(declaredAt)}`);
}
