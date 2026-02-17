module.exports = {
  // TypeScript and JavaScript files (excluding node_modules and pnpm-store)
  '*.{ts,tsx,js,jsx}': files => {
    const filteredFiles = files.filter(
      file =>
        !file.includes('node_modules') &&
        !file.includes('.pnpm-store') &&
        !file.includes('.next') &&
        !file.includes('dist')
    );

    if (filteredFiles.length === 0) return [];

    return [
      `eslint --fix --max-warnings=70 ${filteredFiles
        .map(f => `"${f}"`)
        .join(' ')}`, // TODO: Reducir a 10 después de limpiar warnings legacy
      `prettier --write ${filteredFiles.map(f => `"${f}"`).join(' ')}`,
    ];
  },

  // JSON, Markdown and YAML files (excluding node_modules and pnpm-store)
  '*.{json,md,yml,yaml}': files => {
    const filteredFiles = files.filter(
      file =>
        !file.includes('node_modules') &&
        !file.includes('.pnpm-store') &&
        !file.includes('.next') &&
        !file.includes('dist')
    );

    if (filteredFiles.length === 0) return [];

    return `prettier --write ${filteredFiles.map(f => `"${f}"`).join(' ')}`;
  },
};
