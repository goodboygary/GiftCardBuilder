// Template-based DOCX generation: copies the original Gift Card Order .docx
// and replaces variable text + front/back card images.

export async function generateOrderDocx(
  templateBytes: ArrayBuffer,
  vars: {
    storeId: string;
    orderNumber: number;
    restaurantName: string;
    restaurantNoSpaces: string;
    quantity: number;
    startNum: number;
    endNum: number;
  },
  frontImagePng: Uint8Array,
  backImagePng: Uint8Array,
): Promise<Uint8Array> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(templateBytes);

  const fmtN = (n: number) => n.toString().padStart(9, "0");

  // 1. Replace text in document.xml
  let docXml = await zip.file("word/document.xml")!.async("string");

  // Replace variable values — the original has these exact strings:
  // "2020996" (store ID, appears multiple times)
  // "-1" (order number suffix)
  // "Super Taqueria" (business name)
  // "SuperTaqueria" (no-spaces version in magnetic data)
  // "1000" (quantity)
  // "000000001" (start card number)
  // "000001000" (end card number)
  // "A000000001" (in magnetic data — start)
  // "A000001000" or "AA000001000" (in magnetic data — end; original has "AA" typo)

  // Store ID replacements (careful not to replace inside XML attributes)
  docXml = docXml.replace(/>2020996</g, `>${vars.storeId}<`);
  docXml = docXml.replace(/>2020996\?</g, `>${vars.storeId}?<`);
  docXml = docXml.replace(/\^2020996\?/g, `^${vars.storeId}?`);

  // Order number suffix: "-1" after the store ID
  docXml = docXml.replace(
    new RegExp(`>${vars.storeId}</w:t></w:r><w:r[^>]*><w:rPr>[^<]*</w:rPr><w:t>-1<`),
    `>${vars.storeId}</w:t></w:r><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>-${vars.orderNumber}<`
  );
  // Fallback: simple -1 replacement near store ID
  docXml = docXml.replace(/>-1</g, `>-${vars.orderNumber}<`);

  // Business name
  docXml = docXml.replace(/>Super Taqueria</g, `>${vars.restaurantName}<`);

  // No-spaces name in magnetic data
  docXml = docXml.replace(/SuperTaqueria/g, vars.restaurantNoSpaces);

  // Quantity
  docXml = docXml.replace(/>1000</g, `>${vars.quantity}<`);

  // Card numbers
  docXml = docXml.replace(/000000001/g, fmtN(vars.startNum));
  docXml = docXml.replace(/000001000/g, fmtN(vars.endNum));

  // The original has "%A" in one text run and "A000001000" in the next.
  // After replacing 000001000 above, the "A" prefix remains correct — no fix needed.

  zip.file("word/document.xml", docXml);

  // 2. Replace card preview images (image3.png = front, image4.png = back)
  zip.file("word/media/image3.png", frontImagePng);
  zip.file("word/media/image4.png", backImagePng);

  // 3. Generate the output
  const output = await zip.generateAsync({ type: "uint8array" });
  return output;
}
