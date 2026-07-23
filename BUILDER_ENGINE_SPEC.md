# ZOVO Builder Builder Engine V1.1

## Mission

Construire automatiquement une application complète à partir d'un prompt.

Pipeline :

Prompt
 ↓
PromptAnalyzer
 ↓
BlueprintGenerator
 ↓
Planner
 ↓
FileGenerator
 ↓
WorkspaceWriter
 ↓
Validator
 ↓
Preview
 ↓
Deploy

## Modules à créer

src/core/

- PromptAnalyzer.ts
- BlueprintGenerator.ts
- Planner.ts
- FileGenerator.ts
- WorkspaceWriter.ts
- Validator.ts
- PreviewManager.ts
- DeployManager.ts

## Interfaces

PromptAnalyzer.analyze(prompt)

↓

Blueprint

↓

Planner.plan(blueprint)

↓

ExecutionPlan

↓

FileGenerator.generate(plan)

↓

Artifacts

↓

WorkspaceWriter.write()

↓

Validator.validate()

↓

PreviewManager.start()

## Objectif

Un prompt comme :

Créer un CRM complet.

doit générer automatiquement :

- package.json
- README.md
- dossier app/
- dossier components/
- dossier api/
- configuration
- routes
- base de données
- projet exécutable

Tous les modules doivent être indépendants, testables et extensibles.
