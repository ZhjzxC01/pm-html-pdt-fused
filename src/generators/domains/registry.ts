import type { DomainTemplate, DomainMatchResult } from "./domain-template.js";
import { insuranceClaimDomain } from "./insurance.js";
import { hrLeaveDomain, hrTransferDomain } from "./hr.js";
import { procurementDomain } from "./procurement.js";

const allDomains: DomainTemplate[] = [
  insuranceClaimDomain,
  hrLeaveDomain,
  hrTransferDomain,
  procurementDomain
];

export function matchDomain(input: string): DomainMatchResult | undefined {
  const normalized = input.toLowerCase();
  let bestMatch: DomainMatchResult | undefined;

  for (const domain of allDomains) {
    const matchedKeywords = domain.keywords.filter((kw) => normalized.includes(kw) && hasWordBoundary(normalized, kw));
    if (matchedKeywords.length === 0) continue;

    const confidence = matchedKeywords.length >= 3 ? "high" : matchedKeywords.length >= 2 ? "medium" : "low";

    if (confidence === "low") continue;

    const result: DomainMatchResult = { domain, confidence, matchedKeywords };

    if (!bestMatch || confidenceRank(confidence) > confidenceRank(bestMatch.confidence)) {
      bestMatch = result;
    }
  }

  return bestMatch;
}

function hasWordBoundary(text: string, keyword: string): boolean {
  const idx = text.indexOf(keyword);
  if (idx === -1) return false;

  const isCJK = (ch: string) => /[一-鿿㐀-䶿]/.test(ch);

  const before = idx > 0 ? text[idx - 1] : undefined;
  const after = idx + keyword.length < text.length ? text[idx + keyword.length] : undefined;

  const kwFirst = keyword[0];
  const kwLast = keyword[keyword.length - 1];

  if (before !== undefined && isCJK(before) && isCJK(kwFirst)) return false;
  if (after !== undefined && isCJK(after) && isCJK(kwLast)) return false;

  return true;
}

export function getDomainById(domainId: string): DomainTemplate | undefined {
  return allDomains.find((d) => d.domainId === domainId);
}

export function listDomains(): DomainTemplate[] {
  return [...allDomains];
}

export function registerDomain(domain: DomainTemplate): void {
  const existing = allDomains.findIndex((d) => d.domainId === domain.domainId);
  if (existing >= 0) {
    allDomains[existing] = domain;
  } else {
    allDomains.push(domain);
  }
}

function confidenceRank(c: "high" | "medium" | "low"): number {
  return c === "high" ? 3 : c === "medium" ? 2 : 1;
}
