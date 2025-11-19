// packages/brief-parser/src/evaluate_interview_cli.ts
import { evaluateInterview } from './evaluate_interview';

const id = process.argv[2];
if (!id) {
  console.error('Usage: pnpm tsx evaluate_interview_cli.ts <interview-id>');
  process.exit(1);
}

evaluateInterview(id)
  .then((res) => {
    console.log(JSON.stringify(res, null, 2));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });