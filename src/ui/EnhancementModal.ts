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
		container.style.display = 'grid';
		container.style.gridTemplateColumns = '1fr 1fr';
		container.style.gap = '15px';
		container.style.minHeight = '400px';

		// Оригинальный текст
		const originalDiv = container.createDiv('original-text');
		originalDiv.style.border = '1px solid var(--background-modifier-border)';
		originalDiv.style.borderRadius = '4px';
		originalDiv.style.padding = '10px';
		originalDiv.style.background = 'var(--background-secondary)';
		
		const originalLabel = originalDiv.createEl('div', { text: 'Оригинальный текст' });
		originalLabel.style.fontWeight = 'bold';
		originalLabel.style.marginBottom = '10px';
		originalLabel.style.color = 'var(--text-muted)';

		const originalText = originalDiv.createEl('div', { text: this.originalText });
		originalText.style.whiteSpace = 'pre-wrap';
		originalText.style.fontFamily = 'var(--font-text)';
		originalText.style.fontSize = '14px';
		originalText.style.maxHeight = '350px';
		originalText.style.overflow = 'auto';

		// Улучшенный текст
		const enhancedDiv = container.createDiv('enhanced-text');
		enhancedDiv.style.border = '1px solid var(--background-modifier-border)';
		enhancedDiv.style.borderRadius = '4px';
		enhancedDiv.style.padding = '10px';
		enhancedDiv.style.background = 'var(--background-primary)';

		const enhancedLabel = enhancedDiv.createEl('div', { text: 'Улучшенный текст' });
		enhancedLabel.style.fontWeight = 'bold';
		enhancedLabel.style.marginBottom = '10px';
		enhancedLabel.style.color = 'var(--interactive-accent)';

		this.textArea = enhancedDiv.createEl('textarea', {
			cls: 'enhancement-textarea',
			text: this.enhancedText,
		});
		this.textArea.style.width = '100%';
		this.textArea.style.minHeight = '350px';
		this.textArea.style.padding = '10px';
		this.textArea.style.fontFamily = 'var(--font-text)';
		this.textArea.style.fontSize = '14px';
		this.textArea.style.border = '1px solid var(--background-modifier-border)';
		this.textArea.style.borderRadius = '4px';
		this.textArea.style.resize = 'vertical';
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
