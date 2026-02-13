#!/usr/bin/env python3
"""
Script to replace hardcoded http://localhost:8000 URLs with environment variable.
"""
import os
import re

# Files that need fixing - hardcoded localhost:8000 WITHOUT env fallback
files_to_fix = [
    'src/components/evaluations/EvaluationTemplates.tsx',
    'src/components/evaluations/EvaluationQuestions.tsx',
    'src/components/evaluations/EvaluationComments.tsx',
    'src/components/evaluations/CandidateEvaluations.tsx',
    'src/components/evaluations/EvaluationAnswers.tsx',
    'src/app/evaluacion-publica/[token]/page.tsx',
    'src/components/profiles/ProfileDocuments.tsx',
]

API_URL_CONST = 'const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";'

for fpath in files_to_fix:
    full = os.path.join('.', fpath)
    if not os.path.exists(full):
        print(f'SKIP (not found): {fpath}')
        continue

    with open(full, 'r', encoding='utf-8') as f:
        content = f.read()

    # Count replacements needed
    count = content.count('http://localhost:8000')
    if count == 0:
        print(f'SKIP (no matches): {fpath}')
        continue

    # Check if API_URL const already exists
    has_const = 'const API_URL' in content

    if not has_const:
        # Find insertion point: after last import statement
        lines = content.split('\n')
        insert_idx = 0
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith('import ') or stripped.startswith('from '):
                insert_idx = i + 1

        # Skip blank lines after last import
        while insert_idx < len(lines) and lines[insert_idx].strip() == '':
            insert_idx += 1

        # Insert the const
        lines.insert(insert_idx, '')
        lines.insert(insert_idx + 1, API_URL_CONST)
        lines.insert(insert_idx + 2, '')
        content = '\n'.join(lines)

    # Now replace all hardcoded URLs
    # Replace http://localhost:8000 with ${API_URL}
    content = content.replace('http://localhost:8000', '${API_URL}')

    # Fix cases where ${API_URL} ended up inside double-quoted strings
    # "...${API_URL}..." -> `...${API_URL}...`
    def fix_double_quotes(match):
        inner = match.group(1)
        return '`' + inner + '`'

    content = re.sub(r'"([^"]*\$\{API_URL\}[^"]*)"', fix_double_quotes, content)

    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'FIXED {fpath}: {count} replacements')

print('\nDone!')
