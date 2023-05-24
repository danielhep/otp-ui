/* eslint-disable no-console */
import flatten from "flat";
import { promises as fs } from "fs";
import { extract } from "@formatjs/cli";

import { isNotSpecialId, loadYamlFile, sortSourceAndYmlFiles } from "./util";

interface CheckException {
  ignoredIds: Set<string>;
}

/**
 * Combines exception files into a single exception object.
 */
export async function combineExceptionFiles(
  exceptionFiles: string[]
): Promise<CheckException> {
  let allIgnoredIds = [];
  await Promise.all(
    exceptionFiles.map(async file => {
      const rawJson = (await fs.readFile(file)).toString();
      const jsonObject = JSON.parse(rawJson);
      allIgnoredIds = allIgnoredIds.concat(jsonObject.ignoredIds);
    })
  );
  // Make sure ignored ids are unique
  return {
    ignoredIds: new Set(allIgnoredIds)
  };
}

/**
 * Computes the unused ids from code or YML file for a given locale.
 */
export async function checkLocale(
  ymlFilesForLocale: string[],
  messageIdsFromCode: string[],
  ignoredIds: Set<string>
): Promise<{
  idsNotInCode: string[];
  missingIdsForLocale: string[];
}> {
  const idsChecked = [];
  const idsNotInCode = [];

  const allI18nPromises = ymlFilesForLocale.map(loadYamlFile);
  const allI18nMessages = await Promise.all(allI18nPromises);

  allI18nMessages.forEach(i18nMessages => {
    const flattenedMessages = flatten(i18nMessages);

    // Message ids from code must be present in yml (except those in ignoredIds).
    messageIdsFromCode
      .filter(id => flattenedMessages[id])
      .forEach(id => idsChecked.push(id));

    // Message ids from yml (except those starting with "_" or those in ignoredIds)
    // must be present in code.
    Object.keys(flattenedMessages)
      .filter(isNotSpecialId)
      .filter(id => !ignoredIds.has(id))
      .filter(id => !messageIdsFromCode.includes(id))
      .filter(id => !idsNotInCode.includes(id))
      .forEach(id => idsNotInCode.push(id));
  });

  // Collect ids in code not found in yml.
  const missingIdsForLocale = messageIdsFromCode
    .filter(id => !ignoredIds.has(id))
    .filter(id => !idsChecked.includes(id));

  return {
    idsNotInCode,
    missingIdsForLocale
  };
}

/**
 * Checks message ids completeness between code and yml files for all locales in repo.
 */
async function checkI18n({ exceptionFiles, sourceFiles, ymlFilesByLocale }) {
  // Gather message ids from code.
  const messagesFromCode = JSON.parse(await extract(sourceFiles, {}));
  const messageIdsFromCode = messagesFromCode
    ? Object.keys(messagesFromCode)
    : [];
  const englishUsYmls = ymlFilesByLocale["en-US"];
  console.log(
    `Checking ${messageIdsFromCode.length} strings from ${
      englishUsYmls ? Object.keys(englishUsYmls).length : 0
    } message files against ${sourceFiles.length} source files (${
      exceptionFiles.length
    } exception files).`
  );

  const { ignoredIds } = await combineExceptionFiles(exceptionFiles);
  let errorCount = 0;
  // For each locale, check that all ids in messages are in the yml files.
  // Accessorily, log message ids from yml files that are not used in the code.
  await Promise.all(
    Object.keys(ymlFilesByLocale).map(async locale => {
      const { idsNotInCode, missingIdsForLocale } = await checkLocale(
        ymlFilesByLocale[locale],
        messageIdsFromCode,
        ignoredIds
      );

      // Print errors.
      missingIdsForLocale.forEach(id => {
        console.error(`Message '${id}' is missing from locale ${locale}.`);
      });
      idsNotInCode.forEach(id => {
        console.error(
          `Message '${id}' from locale ${locale} is not used in code.`
        );
      });
      errorCount += missingIdsForLocale.length + idsNotInCode.length;
    })
  );

  console.log(`There were ${errorCount} error(s).`);
  if (errorCount > 0) {
    process.exit(1);
  }
}

/**
 * Checks that message ids gathered by the formatjs extract command are present in the specified folder(s).
 * Produces a process error if message ids are present in a language but not another,
 * or if message ids are found in i18n yml files but not in the code or vice-versa.
 * This script is shipped as part of a package so it can be used in other code bases as needed.
 */
export default function run(): Promise<void> {
  return sortSourceAndYmlFiles(process.argv).then(checkI18n);
}
