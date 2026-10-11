import { Command } from 'commander';
import fs from 'node:fs';

const program = new Command();
// Українські повідомлення та довідка Commander
program.configureHelp({
  helpWidth: 100,
  formatHelp(cmd, helper) {
    const originalHelp = Command.prototype.createHelp.call(cmd);
    const text = originalHelp.formatHelp(cmd, helper);

    return text
      .replace(/^Usage:/gm, 'Використання:')
      .replace(/^Arguments:/gm, 'Аргументи:')
      .replace(/^Options:/gm, 'Опції:')
      .replace(/^Commands:/gm, 'Команди:');
  }
});

program.configureOutput({
  writeErr: (str) => {
    const translated = str
      .replace(/error: missing required argument '([^']+)'/g,
        'Помилка: відсутній обов’язковий аргумент "$1"')
      .replace(/error: unknown option '([^']+)'/g,
        'Помилка: невідома опція "$1"')
      .replace(/error: too many arguments/g,
        'Помилка: забагато аргументів');

    process.stderr.write(translated);
  }
});

program
  .name('lab3')
  .description('CLI-програма для роботи з даними опитування')
  .version('1.0.0')
  .option('-f, --file <path>', 'Шлях до JSON-файлу', 'data.json');

// Читання JSON-файлу
function loadData() {
  const filePath = program.opts().file;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`Помилка: файл "${filePath}" не знайдено.`);
    } else if (error instanceof SyntaxError) {
      console.error(`Помилка: некоректний JSON у файлі "${filePath}".`);
    } else {
      console.error(`Помилка читання файлу: ${error.message}`);
    }

    process.exitCode = 1;
    return null;
  }
}

// Команда hello
program
  .command('hello <name> [surname]')
  .description('Привітати користувача')
  .option('-g, --greeting <text>', 'Текст привітання', 'Привіт')
  .option('-u, --uppercase', 'Вивести привітання великими літерами')
  .action((name, surname, options) => {
    const fullName = surname ? `${name} ${surname}` : name;
    let message = `${options.greeting}, ${fullName}!`;

    if (options.uppercase) {
      message = message.toUpperCase();
    }

    console.log(message);
  });

// Команда list — перелік респондентів
program
  .command('list')
  .description('Показати перелік респондентів')
  .option('-l, --limit <number>', 'Максимальна кількість записів')
  .action((options) => {
    const data = loadData();
    if (!data) return;

    const responses = data.responses;
    let limit = responses.length;

    if (options.limit !== undefined) {
      limit = Number(options.limit);

      if (!Number.isInteger(limit) || limit <= 0) {
        console.error('Помилка: --limit має бути додатним цілим числом.');
        process.exitCode = 1;
        return;
      }
    }

    responses.slice(0, limit).forEach((response) => {
      console.log(`${response.respondentId} — ${response.submittedAt}`);
    });
  });

// Команда show — один респондент
program
  .command('show <respondentId>')
  .description('Показати дані респондента за ідентифікатором')
  .action((respondentId) => {
    const data = loadData();
    if (!data) return;

    const respondent = data.responses.find(
      (response) => response.respondentId === respondentId
    );

    if (!respondent) {
      console.error(`Помилка: респондента "${respondentId}" не знайдено.`);
      process.exitCode = 1;
      return;
    }

    console.log(JSON.stringify(respondent, null, 2));
  });

// Команда field — значення поля
program
  .command('field <respondentId> <path>')
  .description('Показати значення поля респондента')
  .action((respondentId, path) => {
    const data = loadData();
    if (!data) return;

    const respondent = data.responses.find(
      (response) => response.respondentId === respondentId
    );

    if (!respondent) {
      console.error(`Помилка: респондента "${respondentId}" не знайдено.`);
      process.exitCode = 1;
      return;
    }

    let value = respondent;

    for (const part of path.split('.')) {
      if (
        value === null ||
        typeof value !== 'object' ||
        !(part in value)
      ) {
        console.error(`Помилка: поле "${path}" не знайдено.`);
        process.exitCode = 1;
        return;
      }

      value = value[part];
    }

    if (value === null) {
      console.log('null');
    } else if (typeof value === 'object') {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(value);
    }
  });

// Команда questions — питання з фільтрами
program
  .command('questions')
  .description('Показати питання опитування')
  .option('-t, --type <type>', 'Фільтр за типом питання')
  .option('-r, --required <value>', 'Фільтр за обов’язковістю: true або false')
  .action((options) => {
    const data = loadData();
    if (!data) return;

    let questions = data.questions;

    if (options.type) {
      questions = questions.filter(
        (question) => question.type === options.type
      );
    }

    if (options.required !== undefined) {
      if (!['true', 'false'].includes(options.required)) {
        console.error('Помилка: --required має бути true або false.');
        process.exitCode = 1;
        return;
      }

      const required = options.required === 'true';

      questions = questions.filter(
        (question) => question.required === required
      );
    }

    if (questions.length === 0) {
      console.log('Питань за заданими умовами не знайдено.');
      return;
    }

    questions.forEach((question) => {
      console.log(
        `${question.questionId}. ${question.text} (${question.type}, обов'язкове: ${question.required})`
      );
    });
  });

// Команда answers — відповіді на вибране питання
program
  .command('answers <questionId>')
  .description('Показати відповіді всіх респондентів на вибране питання')
  .action((questionId) => {
    const data = loadData();
    if (!data) return;

    const id = Number(questionId);

    if (!Number.isInteger(id) || id <= 0) {
      console.error(
        'Помилка: ідентифікатор питання має бути додатним цілим числом.'
      );
      process.exitCode = 1;
      return;
    }

    const question = data.questions.find(
      (item) => item.questionId === id
    );

    if (!question) {
      console.error(`Помилка: питання з ID ${id} не знайдено.`);
      process.exitCode = 1;
      return;
    }

    console.log(`Питання ${id}: ${question.text}`);

    data.responses.forEach((respondent) => {
      const answer = respondent.answers.find(
        (item) => item.questionId === id
      );

      let value = 'Немає відповіді';

      if (answer && answer.value !== null) {
        value = Array.isArray(answer.value)
          ? answer.value.join(', ')
          : String(answer.value);
      }

      console.log(`${respondent.respondentId}: ${value}`);
    });
  });

// Команда respondent — відповіді одного респондента
program
  .command('respondent <respondentId>')
  .description('Показати відповіді респондента разом із текстами питань')
  .action((respondentId) => {
    const data = loadData();
    if (!data) return;

    const respondent = data.responses.find(
      (response) => response.respondentId === respondentId
    );

    if (!respondent) {
      console.error(`Помилка: респондента "${respondentId}" не знайдено.`);
      process.exitCode = 1;
      return;
    }

    console.log(`Респондент: ${respondent.respondentId}`);

    data.questions.forEach((question) => {
      const answer = respondent.answers.find(
        (item) => item.questionId === question.questionId
      );

      let value = 'Немає відповіді';

      if (answer && answer.value !== null) {
        value = Array.isArray(answer.value)
          ? answer.value.join(', ')
          : String(answer.value);
      }

      console.log(`${question.questionId}. ${question.text}`);
      console.log(`   Відповідь: ${value}`);
    });
  });

// Обробка аргументів командного рядка
program.parse(process.argv);