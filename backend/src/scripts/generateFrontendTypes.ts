// src/scripts/generateFrontendTypes.ts
// npm run gen:types
import { Project, SyntaxKind } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.resolve(__dirname, '../models');
const OUTPUT_FILE = path.resolve(__dirname, '../types/backendTypes.ts');

/**
 * Converts backend TypeScript types to frontend-friendly equivalents.
 * - Date → string
 * - ObjectId variants → string
 * - Removes Mongoose/Document references
 */
function toFrontendType(typeStr: string): string {
  return typeStr
    // Only replace standalone "Date" (not inside "startDate", etc.)
    .replace(/\bDate\b/g, 'string')
    // Replace ObjectId variants (with word boundaries for safety)
    .replace(/\bmongoose\.Types\.ObjectId\b/g, 'string')
    .replace(/\bTypes\.ObjectId\b/g, 'string')
    .replace(/\bObjectId\b/g, 'string')
    // Clean up imports and document types
    .replace(/import\(.*?\)\./g, '')
    .replace(/\bDocument\b\s*[,&]?/g, '')
    .replace(/extends\s+[^{]+/g, '')
    .trim();
}

function generateTypes(): void {
  if (!fs.existsSync(MODELS_DIR)) {
    console.error(`❌ Models directory not found: ${MODELS_DIR}`);
    process.exit(1);
  }

  const project = new Project({
    tsConfigFilePath: path.resolve(__dirname, '../../tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });

  const allInterfaces: Array<{ name: string; members: string[] }> = [];
  const modelFiles = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.ts'));

  for (const file of modelFiles) {
    const filePath = path.join(MODELS_DIR, file);
    const sourceFile = project.addSourceFileAtPath(filePath);

    // Extract all exported interfaces
    const interfaces = sourceFile.getInterfaces().filter(i => i.isExported());
    for (const iface of interfaces) {
      const name = iface.getName();
      if (name.includes('<')) continue; // Skip generic interfaces

      const members: string[] = [];
      iface.getMembers().forEach(member => {
        if (member.getKind() === SyntaxKind.PropertySignature) {
          const prop = member.asKind(SyntaxKind.PropertySignature);
          const propName = prop.getName();
          let propType = prop.getTypeNode()?.getText() || 'any';

          // Convert to frontend-friendly types
          propType = toFrontendType(propType);

          // Handle optional properties
          const isOptional = prop.hasQuestionToken();
          const questionMark = isOptional ? '?' : '';

          // Handle comments (if any)
          const commentRanges = prop.getLeadingCommentRanges();
          const comment = commentRanges.length > 0 ? commentRanges[0].getText() : '';

          let memberStr = '';
          if (comment) {
            memberStr += `  ${comment}\n`;
          }
          memberStr += `  ${propName}${questionMark}: ${propType};`;
          members.push(memberStr);
        }
      });

      allInterfaces.push({ name, members });
    }
  }

  if (allInterfaces.length === 0) {
    console.error('❌ No exported interfaces found in models directory.');
    console.error('💡 Make sure your model files contain: export interface IName { ... }');
    process.exit(1);
  }

  // Generate output
  let output = `// AUTO-GENERATED from backend Mongoose models\n`;
  output += `// DO NOT EDIT MANUALLY\n\n`;

  allInterfaces.forEach(({ name, members }) => {
    output += `export interface ${name} {\n`;
    output += `  _id: string;\n`;
    output += members.join('\n') + '\n';
    output += `}\n\n`;
  });

  // Write to file
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  console.log(`✅ Generated ${allInterfaces.length} interfaces →`);
  console.log(`📁 ${OUTPUT_FILE}`);
}

generateTypes();
