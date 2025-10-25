"use server"

import { generateText } from "ai"
import { prisma } from "@/lib/prisma"

export async function generateCVSection(section: string, context: any, model = "openai/gpt-4o-mini") {
  try {
    const prompt = buildPrompt(section, context)

    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.7,
    })

    return { success: true, text }
  } catch (error) {
    console.error("[v0] AI generation error:", error)
    return { success: false, error: "Erreur lors de la génération" }
  }
}

export async function improveText(text: string, context: string, model = "openai/gpt-4o-mini") {
  try {
    const { text: improvedText } = await generateText({
      model,
      prompt: `Améliore le texte suivant pour un CV professionnel. Contexte: ${context}

Texte à améliorer:
${text}

Retourne uniquement le texte amélioré, sans commentaires.`,
      temperature: 0.7,
    })

    return { success: true, text: improvedText }
  } catch (error) {
    console.error("[v0] AI improve error:", error)
    return { success: false, error: "Erreur lors de l'amélioration" }
  }
}

export async function rephraseText(text: string, tone = "professional", model = "openai/gpt-4o-mini") {
  try {
    const { text: rephrasedText } = await generateText({
      model,
      prompt: `Reformule le texte suivant avec un ton ${tone} pour un CV.

Texte:
${text}

Retourne uniquement le texte reformulé, sans commentaires.`,
      temperature: 0.8,
    })

    return { success: true, text: rephrasedText }
  } catch (error) {
    console.error("[v0] AI rephrase error:", error)
    return { success: false, error: "Erreur lors de la reformulation" }
  }
}

export async function translateText(text: string, targetLanguage: string, model = "openai/gpt-4o-mini") {
  try {
    const { text: translatedText } = await generateText({
      model,
      prompt: `Traduis le texte suivant en ${targetLanguage} en conservant le ton professionnel d'un CV.

Texte:
${text}

Retourne uniquement la traduction, sans commentaires.`,
      temperature: 0.3,
    })

    return { success: true, text: translatedText }
  } catch (error) {
    console.error("[v0] AI translate error:", error)
    return { success: false, error: "Erreur lors de la traduction" }
  }
}

export async function extractKeywords(text: string, model = "openai/gpt-4o-mini") {
  try {
    const { text: keywordsText } = await generateText({
      model,
      prompt: `Extrais les mots-clés et compétences importantes du texte suivant pour un CV.

Texte:
${text}

Retourne uniquement une liste de mots-clés séparés par des virgules, sans commentaires.`,
      temperature: 0.3,
    })

    const keywords = keywordsText.split(",").map((k) => k.trim())
    return { success: true, keywords }
  } catch (error) {
    console.error("[v0] AI keywords error:", error)
    return { success: false, error: "Erreur lors de l'extraction" }
  }
}

export async function extractCVData(cvText: string, model = "openai/gpt-4o-mini") {
  try {
    const { text } = await generateText({
      model,
      prompt: `Extrais les informations structurées du CV suivant et retourne un JSON valide avec cette structure:
{
  "personal": {
    "firstName": "",
    "lastName": "",
    "email": "",
    "phone": "",
    "address": "",
    "city": "",
    "postalCode": "",
    "country": "",
    "professionalTitle": "",
    "summary": ""
  },
  "experiences": [
    {
      "companyName": "",
      "position": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "description": ""
    }
  ],
  "education": [
    {
      "institutionName": "",
      "degree": "",
      "fieldOfStudy": "",
      "startDate": "",
      "endDate": "",
      "description": ""
    }
  ],
  "skills": [
    {
      "skillName": "",
      "proficiencyLevel": "",
      "category": ""
    }
  ]
}

CV:
${cvText}

Retourne uniquement le JSON, sans commentaires ni formatage markdown.`,
      temperature: 0.1,
    })

    // Parse the JSON response
    const cleanedText = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()
    const data = JSON.parse(cleanedText)

    return { success: true, data }
  } catch (error) {
    console.error("[v0] AI extraction error:", error)
    return { success: false, error: "Erreur lors de l'extraction des données" }
  }
}

export async function autoFillFromProfile(userId: string, fieldType: string, model = "openai/gpt-4o-mini") {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const experiences = await prisma.experience.findMany({ where: { userId } })
    const education = await prisma.education.findMany({ where: { userId } })
    const skills = await prisma.skill.findMany({ where: { userId } })

    const context = {
      user,
      experiences,
      education,
      skills,
    }

    const { text } = await generateText({
      model,
      prompt: `Génère un texte professionnel pour la section "${fieldType}" d'un CV basé sur les données suivantes:

${JSON.stringify(context, null, 2)}

Retourne uniquement le texte généré, sans commentaires.`,
      temperature: 0.7,
    })

    return { success: true, text }
  } catch (error) {
    console.error("[v0] AI auto-fill error:", error)
    return { success: false, error: "Erreur lors du remplissage automatique" }
  }
}

function buildPrompt(section: string, context: any): string {
  const prompts: Record<string, string> = {
    summary: `Génère un résumé professionnel percutant pour un CV basé sur ces informations:
- Titre: ${context.title || "Non spécifié"}
- Expérience: ${context.yearsOfExperience || "Non spécifié"} ans
- Compétences clés: ${context.skills?.join(", ") || "Non spécifié"}
- Objectif: ${context.objective || "Non spécifié"}

Le résumé doit être concis (3-4 phrases), professionnel et mettre en valeur les points forts.`,

    experience: `Génère une description d'expérience professionnelle pour un CV:
- Poste: ${context.position}
- Entreprise: ${context.company}
- Responsabilités: ${context.responsibilities || "Non spécifié"}
- Réalisations: ${context.achievements || "Non spécifié"}

La description doit être en bullet points, orientée résultats et quantifiée si possible.`,

    skills: `Génère une liste de compétences pertinentes pour un CV dans le domaine: ${context.field || "général"}
Niveau d'expérience: ${context.level || "intermédiaire"}

Retourne une liste de 8-12 compétences techniques et soft skills pertinentes.`,
  }

  return prompts[section] || `Génère du contenu professionnel pour la section "${section}" d'un CV.`
}
