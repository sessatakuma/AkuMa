export default function isKana(str: string): boolean {
    return /^[ぁ-んァ-ンーゔゞ゛゜\u3000、。・「」『』（）《》【】！？：；—…‥〜]+$/.test(str);
}
