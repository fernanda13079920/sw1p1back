import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

@Injectable()
export class ExportService {
  templatePath = path.join(process.cwd(), 'export', 'templates', 'angular');
  exportTmpPath = path.join(process.cwd(), 'tmp-export');

  async exportRoomAsAngular(roomCode: string): Promise<string> {
    const roomJsonPath = path.join(process.cwd(), 'canvas-files', `${roomCode}.json`);
    const jsonExists = await existsAsync(roomJsonPath);
    if (!jsonExists) throw new Error(`No existe archivo JSON para la sala: ${roomCode}`);

    const rawData = await readFileAsync(roomJsonPath, 'utf8');
    const { components } = JSON.parse(rawData);

    const roomExportPath = path.join(this.exportTmpPath, `angular-${roomCode}`);
    fs.rmSync(roomExportPath, { recursive: true, force: true });
    fs.cpSync(this.templatePath, roomExportPath, { recursive: true });

    const htmlOutput = this.convertJsonToHtml(components);
    const pagesDir = path.join(roomExportPath, 'src', 'app', 'pages', `pages-${roomCode}`);
    await mkdirAsync(pagesDir, { recursive: true });

    const htmlPath = path.join(pagesDir, `pages-${roomCode}.component.html`);
    const tsPath = path.join(pagesDir, `pages-${roomCode}.component.ts`);

    await writeFileAsync(htmlPath, htmlOutput);
    await writeFileAsync(tsPath, this.generateComponentTs(roomCode));

    // 🔥 Manejo opcional de app.module.ts (solo si existe)
    const modulePath = path.join(roomExportPath, 'src', 'app', 'app.module.ts');
    if (fs.existsSync(modulePath)) {
      let moduleContent = await readFileAsync(modulePath, 'utf8');

      const importLine = `import { Pages${roomCode}Component } from './pages/pages-${roomCode}/pages-${roomCode}.component';`;
      if (!moduleContent.includes(importLine)) {
        moduleContent = importLine + '\n' + moduleContent;

        const declarationsRegex = /declarations:\s*\[(.*?)\]/s;
        const match = moduleContent.match(declarationsRegex);
        if (match) {
          const updated = match[1].trim() + `, Pages${roomCode}Component`;
          moduleContent = moduleContent.replace(declarationsRegex, `declarations: [${updated}]`);
        }

        await writeFileAsync(modulePath, moduleContent);
      }
    }

    const zipPath = path.join(this.exportTmpPath, `angular-${roomCode}.zip`);
    await this.zipDirectory(roomExportPath, zipPath);

    return zipPath;
  }

  private convertJsonToHtml(components: any[]): string {
    const render = (comp: any): string => {
      const tag = comp.type || 'div';
      const style = Object.entries(comp.style || {}).map(([k, v]) => `${k}: ${v}`).join(';');
      const content = comp.content || '';
      const children = (comp.children || []).map(render).join('');
      return `<${tag} style="${style}">${content}${children}</${tag}>`;
    };
    return `<body>\n${components.map(render).join('\n')}\n</body>`;
  }

  private generateComponentTs(roomCode: string): string {
    return `import { Component } from '@angular/core';

@Component({
  selector: 'app-pages-${roomCode}',
  templateUrl: './pages-${roomCode}.component.html',
  styleUrls: []
})
export class Pages${roomCode}Component {}`;
  }

  private async zipDirectory(source: string, out: string): Promise<void> {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(out);

    return new Promise((resolve, reject) => {
      archive.directory(source, false).on('error', err => reject(err)).pipe(stream);
      stream.on('close', () => resolve());
      archive.finalize();
    });
  }
}
