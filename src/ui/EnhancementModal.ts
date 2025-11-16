import { App, Modal, Setting } from 'obsidian';

export interface TextHistory {
	original: string;
	enhanced: string;
	timestamp: number;
}

export class EnhancementModal extends Modal {
	private originalText: string;
	private enhancedText: string;
	private onConfirm: (text: string) => void;
	private onCancel: () => void;
	private onUndo?: () => void;
	private textArea: HTMLTextAreaElement;
	private showComparison: boolean = false;
	private history?: TextHistory;

	constructor(
		app: App,
		originalText: string,
		enhancedText: string,
		onConfirm: (text: string) => void,
		onCancel: () => void,
		onUndo?: () => void,
		history?: TextHistory
	) {
		super(app);
		this.originalText = originalText;
		this.enhancedText = enhancedText;
		this.onConfirm = onConfirm;
		this.onCancel = onCancel;
		this.onUndo = onUndo;
		this.history = history;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('text-enhancer-modal');
		
		// Увеличиваем ширину модального окна и предотвращаем горизонтальную прокрутку
		this.modalEl.style.width = '98vw';
		this.modalEl.style.maxWidth = '98vw';
		this.modalEl.style.minWidth = '1400px';
		this.modalEl.style.overflowX = 'hidden';
		this.modalEl.style.boxSizing = 'border-box';
		
		// Применяем стили к contentEl
		contentEl.style.width = '100%';
		contentEl.style.maxWidth = '100%';
		contentEl.style.boxSizing = 'border-box';
		contentEl.style.overflowX = 'hidden';

		// Заголовок с вкладками
		const header = contentEl.createDiv('enhancement-header');
		const title = header.createEl('h2', { text: 'Предпросмотр улучшенного текста' });
		title.style.marginTop = '0';
		title.style.marginBottom = '15px';

		// Переключатель режима просмотра
		const viewToggle = header.createDiv('view-toggle');
		viewToggle.style.display = 'flex';
		viewToggle.style.gap = '10px';
		viewToggle.style.marginBottom = '15px';

		const previewBtn = viewToggle.createEl('button', { text: 'Предпросмотр' });
		const compareBtn = viewToggle.createEl('button', { text: 'Сравнение' });
		
		[previewBtn, compareBtn].forEach(btn => {
			btn.style.padding = '8px 16px';
			btn.style.border = '1px solid var(--background-modifier-border)';
			btn.style.borderRadius = '4px';
			btn.style.background = 'var(--background-secondary)';
			btn.style.color = 'var(--text-normal)';
			btn.style.cursor = 'pointer';
		});

		const updateView = () => {
			previewBtn.style.background = this.showComparison 
				? 'var(--background-secondary)' 
				: 'var(--interactive-accent)';
			compareBtn.style.background = this.showComparison 
				? 'var(--interactive-accent)' 
				: 'var(--background-secondary)';
			this.renderContent();
		};

		previewBtn.onclick = () => {
			this.showComparison = false;
			updateView();
		};

		compareBtn.onclick = () => {
			this.showComparison = true;
			updateView();
		};

		updateView();

		// Горячие клавиши
		this.scope.register(['Mod'], 'Enter', () => {
			this.onConfirm(this.textArea.value);
			this.close();
		});

		this.scope.register([], 'Escape', () => {
			this.onCancel();
			this.close();
		});
	}

	private renderContent() {
		const { contentEl } = this;
		
		// Удаляем старый контент (кроме заголовка)
		const oldContainer = contentEl.querySelector('.enhancement-container');
		const oldButtons = contentEl.querySelector('.enhancement-buttons');
		const oldHint = contentEl.querySelector('.enhancement-hint');
		oldContainer?.remove();
		oldButtons?.remove();
		oldHint?.remove();

		if (this.showComparison) {
			this.renderComparison();
		} else {
			this.renderPreview();
		}

		this.renderButtons();
	}

	private renderPreview() {
		const { contentEl } = this;
		const container = contentEl.createDiv('enhancement-container');
		
		this.textArea = container.createEl('textarea', {
			cls: 'enhancement-textarea',
			text: this.enhancedText,
		});
		this.textArea.style.width = '100%';
		this.textArea.style.minHeight = '400px';
		this.textArea.style.padding = '10px';
		this.textArea.style.fontFamily = 'var(--font-text)';
		this.textArea.style.fontSize = '14px';
		this.textArea.style.border = '1px solid var(--background-modifier-border)';
		this.textArea.style.borderRadius = '4px';
		this.textArea.style.resize = 'vertical';
	}

	private renderComparison() {
		const { contentEl } = this;
		const container = contentEl.createDiv('enhancement-container');

		// Оригинальный текст
		const originalDiv = container.createDiv('original-text');
		
		const originalLabel = originalDiv.createEl('div', { text: 'Оригинальный текст' });
		originalLabel.style.color = 'var(--text-muted)';

		const originalText = originalDiv.createEl('div', { text: this.originalText });

		// Улучшенный текст
		const enhancedDiv = container.createDiv('enhanced-text');

		const enhancedLabel = enhancedDiv.createEl('div', { text: 'Улучшенный текст' });
		enhancedLabel.style.color = 'var(--interactive-accent)';

		this.textArea = enhancedDiv.createEl('textarea', {
			cls: 'enhancement-textarea',
			text: this.enhancedText,
		});
		this.textArea.style.width = '100%';
		this.textArea.style.padding = '10px';
		this.textArea.style.fontFamily = 'var(--font-text)';
		this.textArea.style.fontSize = '14px';
		this.textArea.style.border = '1px solid var(--background-modifier-border)';
		this.textArea.style.borderRadius = '4px';
		this.textArea.style.resize = 'none';
		this.textArea.style.overflowY = 'auto';
		this.textArea.style.wordWrap = 'break-word';
		this.textArea.style.wordBreak = 'break-word';
		this.textArea.style.whiteSpace = 'pre-wrap';
		this.textArea.style.overflowWrap = 'break-word';
	}

	private renderButtons() {
		const { contentEl } = this;
		const buttonContainer = contentEl.createDiv('enhancement-buttons');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '10px';
		buttonContainer.style.marginTop = '15px';
		buttonContainer.style.justifyContent = 'space-between';

		// Левая часть - кнопка отмены
		const leftButtons = buttonContainer.createDiv();
		leftButtons.style.display = 'flex';
		leftButtons.style.gap = '10px';

		if (this.onUndo && this.history) {
			new Setting(leftButtons)
				.addButton((btn) => {
					btn.setButtonText('↶ Отменить')
						.onClick(() => {
							this.onUndo!();
							this.close();
						});
				});
		}

		// Правая часть - основные кнопки
		const rightButtons = buttonContainer.createDiv();
		rightButtons.style.display = 'flex';
		rightButtons.style.gap = '10px';

		new Setting(rightButtons)
			.addButton((btn) => {
				btn.setButtonText('Отмена (Esc)')
					.setCta()
					.onClick(() => {
						this.onCancel();
						this.close();
					});
			})
			.addButton((btn) => {
				btn.setButtonText('Применить (Ctrl+Enter)')
					.setCta()
					.onClick(() => {
						this.onConfirm(this.textArea.value);
						this.close();
					});
			});

		// Подсказка
		const hint = contentEl.createDiv('enhancement-hint');
		hint.style.marginTop = '10px';
		hint.style.fontSize = '12px';
		hint.style.color = 'var(--text-muted)';
		hint.innerHTML = '💡 Вы можете отредактировать текст перед применением. <kbd>Ctrl+Enter</kbd> - применить, <kbd>Esc</kbd> - отмена';
	}
}
