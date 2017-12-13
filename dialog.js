(function() {

'use strict';

const firefox = (typeof InstallTrigger !== 'undefined') ? true : false;
const brauzer = firefox ? browser : chrome;

const type    = decodeURIComponent(document.location.hash).replace('#', '');
const doc     = document.documentElement;

send('background', 'request', 'dialog', {needResponse: true}, response => {
	makeDialogWindow(response.data, response.warnings, response.theme);
});

function setFontSize() {
	document.body.style.fontSize = `${10 / window.devicePixelRatio}px`;
}

function makeDialogWindow(data, warnings, colors) {

	setFontSize();
	window.onresize = _ => {setFontSize();};

	doc.style.setProperty('--background-color', colors.backgroundColor);
	doc.style.setProperty('--background-color-active', colors.backgroundColorActive);
	doc.style.setProperty('--font-color', colors.fontColor);
	doc.style.setProperty('--font-color-active', colors.fontColorActive);
	doc.style.setProperty('--font-color-inactive', colors.fontColorInactive);
	doc.style.setProperty('--border-color', colors.borderColor);
	doc.style.setProperty('--border-color-active', colors.borderColorActive);

	let optionsChanged = false;
	let completer, completerTimer;
	let okButton, cancelButton;

	const dialog   = document.createElement('div');
	const header   = document.createElement('header');
	const main     = document.createElement('main');
	const footer   = document.createElement('footer');
	const warning  = document.createElement('div');
	const buttons  = document.createElement('div');
	dialog.id      = 'sbp-dialog';
	document.body.appendChild(dialog);
	let width = document.body.offsetWidth / 3;
	if (width > 600) width  = 600;
	if (width < 300) width  = 300;
	dialog.style.width      = `${width}px`;
	dialog.appendChild(header);
	dialog.appendChild(main);
	dialog.appendChild(footer);
	footer.appendChild(warning);
	footer.appendChild(buttons);
	main.addEventListener('change', _ => {
		optionsChanged = true;
	});
	dialog.classList.add(type);

	const setHeader = _ => {
		header.textContent = getI18n(`dialog${type}Header`);
	};

	// const addInputRow = (labelText, inputType, inputValue, inputPlaceholder = '', reverse = false) => {
	// 	const label = document.createElement('label');
	// 	label.textContent = labelText;
	// 	main.appendChild(label);
	// 	if (inputType === 'textarea') {
	// 		const input = document.createElement('textarea');
	// 		input.value = inputValue;
	// 		main.appendChild(input);
	// 		return input;
	// 	}
	// 	const input = document.createElement('input');
	// 	input.type = inputType;
	// 	if (inputType === 'text') input.placeholder = inputPlaceholder;
	// 	if (inputType === 'checkbox') input.checked = inputValue;
	// 	else input.value = inputValue;
	// 	if (reverse !== false) {
	// 		label.classList.add('reverse');
	// 		label.addEventListener('click', event => {
	// 			event.stopPropagation();
	// 			label.previousElementSibling.click();
	// 		});
	// 		main.insertBefore(input, label);
	// 	}
	// 	else
	// 		main.appendChild(input);
	// 	return input;
	// };

	const addInputRow =  {
		text : inputType => {
			const label       = document.createElement('label');
			label.textContent = getI18n(`dialog${inputType}Label`);
			const input       = document.createElement('input');
			input.type        = 'text';
			input.placeholder = getI18n(`dialog${type}${inputType}Placeholder`);
			input.value       = data.hasOwnProperty(inputType) ? data[inputType] : '';
			main.appendChild(label);
			main.appendChild(input);
			return input;
		},
		textarea : inputType => {
			const label       = document.createElement('label');
			label.textContent = getI18n(`dialog${inputType}Label`);
			const input       = document.createElement('textarea');
			input.value       = data.hasOwnProperty(inputType) ? data[inputType] : '';
			main.appendChild(label);
			main.appendChild(input);
			return input;
		},
		color : _ => {
			const label       = document.createElement('label');
			label.textContent = getI18n(`dialogColorLabel`);
			const input       = document.createElement('input');
			input.type        = 'color';
			input.value       = data.hasOwnProperty('color') ? data.color : '#006688';
			main.appendChild(label);
			main.appendChild(input);
			return input;
		},
		checkbox : (inputType, reverse = false) => {
			const label       = document.createElement('label');
			label.textContent = getI18n(`dialog${inputType}Label`);
			const input       = document.createElement('input');
			input.type        = 'checkbox';
			input.checked     = data[inputType];
			if (reverse === false) {
				main.appendChild(label);
				main.appendChild(input);
			}
			else {
				label.classList.add('reverse');
				label.addEventListener('click', event => {
					event.stopPropagation();
					label.previousElementSibling.click();
				});
				main.appendChild(input);
				main.appendChild(label);
			}
			return input;
		},
	};

	const addSelectRow = (labelText, options) => {
		const label = document.createElement('label');
		label.textContent = labelText;
		main.appendChild(label);
		const select = document.createElement('select');
		for (let i = 0, l = options.length; i < l; i++) {
			const option = document.createElement('option');
			option.value = options[i].id;
			option.textContent = options[i].title;
			select.appendChild(option);
		}
		main.appendChild(select);
		return select;
	};

	const addWarning = _ => {
		const input       = document.createElement('input');
		input.type        = 'checkbox';
		input.checked     = warnings[type];
		input.addEventListener('click', event => {
			event.stopPropagation();
			send('background', 'options', 'handler', {'section': 'warnings', 'option': type, 'value': input.checked});
		});
		warning.appendChild(input);
		const label       = document.createElement('label');
		label.textContent = getI18n('dialogAskAgainWarning');
		label.addEventListener('click', event => {
			event.stopPropagation();
			label.previousElementSibling.click();
		});
		warning.appendChild(label);
		return input;
	};

	const addButton = (type, callback) => {
		const button = document.createElement('span');
		const make = {
			save    : _ => {
				button.textContent = getI18n('dialogSaveButton');
				button.addEventListener('click', callback);
				okButton = button;
			},
			delete  : _ => {
				button.textContent = getI18n('dialogDeleteButton');
				button.addEventListener('click', callback);
			},
			confirm : _ => {
				button.textContent = getI18n('dialogConfirmButton');
				button.addEventListener('click', callback);
				okButton = button;
			},
			cancel  : _ => {
				button.textContent = getI18n('dialogCancelButton');
				button.addEventListener('click', removeDialogWindow);
				cancelButton = button;
			}
		};
		make[type]();
		buttons.appendChild(button);
	};

	const addAutoCompleter = _ => {
		completer = document.createElement('div');
		completer.id = 'completer';
		dialog.appendChild(completer);
		return completer;
	};

	const addAlert = _ => {
		const p       = document.createElement('p');
		p.textContent = getI18n(`dialog${type}Alert`, [data.title]);
		main.appendChild(p);
	};

	const showCompleter = response => {
		if (response.length === 0)
			return hideCompleter();
		cleanCompleter();
		const inputs    = dialog.querySelectorAll('input');
		const rect      = inputs[0].getClientRects()[0];
		for (let i = 0, l = response.length; i < l; i++) {
			const site                 = document.createElement('p');
			site.textContent           = response[i].title || response[i].url;
			site.dataset.index         = i;
			site.title                 = response[i].url;
			site.style.backgroundImage = `url(${response[i].fav})`;
			completer.appendChild(site);
		}
		completer.style.display = 'block';
		completer.style.top     = rect.bottom + 'px';
		completer.style.left    = rect.left + 'px';
		completer.style.width   = rect.width + 'px';
		document.addEventListener('click', event => {
			if (event.target.nodeName === 'P') {
				const index     = event.target.dataset.index;
				inputs[0].value = response[index].url;
				inputs[1].value = response[index].color;
			}
			hideCompleter();
			completer.style.display = 'none';
		});
	};

	const hideCompleter = _ => {
		cleanCompleter();
		completer.style.display = 'none';
	};

	const cleanCompleter = _ => {
		for (let i = completer.firstChild; i !== null; i = completer.firstChild)
			completer.removeChild(i);
	};

	const removeDialogWindow = _ => {
		send('background', 'dialog', 'remove', {});
	};

	const getI18n = (message, subs) => {
		return brauzer.i18n.getMessage(message, subs);
	};

	const keyboardListener = event => {
		event.stopPropagation();
		if (/textarea/i.test(event.target.nodeName)) return;
		if (event.key === 'Escape')
			cancelButton.click();
		else if (event.key === 'Enter') {
			const focused = document.querySelector(':focus');
			if (focused !== null)
				focused.blur();
			okButton.click();
		}
	};

	const fillWindow = {

		siteCreate : _ => {

			let completerTimer;
			let lastValue;
			setHeader();
			const inputUrl   = addInputRow.text('url');
			addAutoCompleter();
			const inputColor = addInputRow.color();
			inputUrl.addEventListener('keyup', function() {
				if (inputUrl.value.length > 2) {
					if (lastValue !== inputUrl.value) {
						lastValue = inputUrl.value;
						send('background', 'history', 'search', {request: inputUrl.value, maxResults: 10, needResponse: true}, response => showCompleter(response));
					}
				}
				else
					hideCompleter();
			});
			addButton('save', _ => {
				if (optionsChanged === true) {
					const url   = inputUrl.value;
					if (url !== '')
						send('background', 'startpage', 'create',
							{
								'url'   : url,
								'index' : data.index,
								'color' : inputColor.value,
							}
						);
				}
				removeDialogWindow();
			});
			addButton('cancel');
			inputUrl.focus();
		},

		siteChange : _ => {

			setHeader();
			const inputUrl   = addInputRow.text('url');
			const inputText  = addInputRow.textarea('text');
			const inputColor = addInputRow.color();
			addButton('save', _ => {
				if (optionsChanged === true)
					send('background', 'startpage', 'change', {'index': data.index, 'url': inputUrl.value, 'color': inputColor.value, 'text': inputText.value});
				removeDialogWindow();
			});
			addButton('delete', _ => {
				removeDialogWindow();
				if (warnings.deleteSite === true)
					send('background', 'dialog', 'siteDelete', {'index': data.index, 'title': data.url});
				else
					send('background', 'startpage', 'delete', {'index': data.index});
			});
			addButton('cancel');
		},

		siteDelete : _ => {

			setHeader();
			addAlert();
			addWarning();
			addButton('confirm', _ => {
				send('background', 'startpage', 'delete', {'index': data.index});
				removeDialogWindow();
			});
			addButton('cancel');
		},

		domainFolderClose : _ => {

			setHeader();
			addAlert();
			addWarning();
			addButton('confirm', _ => {
				send('background', 'tabs', 'removeByDomain', {'id': data.id});
				removeDialogWindow();
			});
			addButton('cancel');
		},

		bookmarkDelete : _ => {

			setHeader();
			addAlert();
			addWarning();
			addButton('confirm', _ => {
				send('background', 'bookmarks', 'deleteItem', {'id': data.id});
				removeDialogWindow();
			});
			addButton('cancel');
		},

		bookmarkFolderDelete : _ => {

			setHeader();
			addAlert();
			addWarning();
			addButton('confirm', _ => {
				send('background', 'bookmarks', 'bookmarksFolderDelete', {'id': data.id});
				removeDialogWindow();
			});
			addButton('cancel');
		},

		bookmarkNew : _ => {

			setHeader();
			const inputUrl    = addInputRow.text('url');
			const inputTitle  = addInputRow.text('title');
			const folder      = addSelectRow(getI18n('dialogBookmarkFoldersLabel'), data.folders);
			addButton('save', _ => {
				send('background', 'bookmarks', 'newBookmark', {'url': inputUrl.value, 'title': inputTitle.value, 'parentId': folder.value || "0"});
				removeDialogWindow();
			});
			addButton('cancel');
		},

		bookmarkEdit : _ => {

			setHeader();
			const inputTitle  = addInputRow.text('title');
			const inputUrl    = addInputRow.text('url');
			addButton('save', _ => {
				send('background', 'bookmarks', 'bookmarkEdit', {'id': data.id, 'changes': {'url': inputUrl.value, 'title': inputTitle.value}});
				removeDialogWindow();
			});
			addButton('cancel');
		},

		bookmarkFolderEdit : _ => {

			setHeader();
			const inputTitle  = addInputRow.text('title');
			addButton('save', _ => {
				send('background', 'bookmarks', 'bookmarkFolderEdit', {'id': data.id, 'changes' : {'title': inputTitle.value}});
				removeDialogWindow();
			});
			addButton('cancel');
		},

		rssNew : _ => {

			setHeader();
			const inputTitle  = addInputRow.text('title');
			const inputUrl    = addInputRow.text('url');
			addButton('save', _ => {
				if (optionsChanged === true || data.hasOwnProperty('url')) {
					const url = inputUrl.value;
					if (url !== '')
						send('background', 'rss', 'rssNew', {'url': url, 'title': inputTitle.value});
				}
				removeDialogWindow();
			});
			addButton('cancel');
			inputUrl.focus();
		},

		rssFeedEdit : _ => {

			setHeader();
			const inputTitle = addInputRow.text('title');
			const inputDesc  = addInputRow.text('description');
			addButton('save', _ => {
				if (optionsChanged === true) {
					send('background', 'rss', 'rssEditFeed', {'id': data.id, 'title': inputTitle.value, 'description': inputDesc.value});
				removeDialogWindow();
				}
			});
			addButton('delete', _ => {
				if (warnings.deleteRssFeed === true)
					send('background', 'dialog', 'rssDeleteFeed', {'id': data.id, 'title': data.title});
				else
					send('background', 'rss', 'rssDeleteFeed', {'id': data.id});

			});
			addButton('cancel');
			inputTitle.focus();
		},

		rssFeedDelete : _ => {

			setHeader();
			addAlert();
			addWarning();
			addButton('confirm', _ => {
				send('background', 'rss', 'rssFeedDelete', {'id': data.id});
				removeDialogWindow();
			});
			addButton('cancel');
		},

		downloadDelete : _ => {

			setHeader();
			const alert = document.createElement('p');
			let title = data.title;
			if (title.length > 30)
				title = title.substring(0, 28) + '...';
			alert.textContent = getI18n('dialogDownloadDeleteAlert', [title]);
			main.appendChild(alert);
			const deleteFromHistory = addInputRow.checkbox(true, true);
			const deleteFile        = addInputRow.checkbox(false, true);
			addButton('confirm', _ => {
				if (deleteFile.checked === true)
					send('background', 'downloads', 'removeFile', {'id': data.id});
				if (deleteFromHistory.checked === true)
					send('background', 'downloads', 'erase', {'id': data.id});
				removeDialogWindow();
			});
			addButton('cancel');
		},

		pocketNew : _ => {

			setHeader();
			const inputUrl   = addInputRow.text('url');
			const inputTitle = addInputRow.text('title');
			addButton('save', _ => {
				if (optionsChanged === true || data.hasOwnProperty('url')) {
					const url = inputUrl.value;
					if (url !== '')
						send('background', 'pocket', 'add', {'url': url, 'title': inputTitle.value});
				}
				removeDialogWindow();
			});
			addButton('cancel');
		},

		pocketDelete : _ => {

			setHeader();

			const alert = document.createElement('p');
			let title = data.title;
			if (title.length > 30)
				title = title.substring(0, 28) + '...';
			alert.textContent = getI18n('dialogPocketDeleteAlert', [title]);
			main.appendChild(alert);

			addButton('confirm', _ => {
				send('background', 'pocket', 'delete', data.id);
				removeDialogWindow();
			});
			addButton('cancel');
		},
	};

	fillWindow[type]();
	document.body.style.paddingTop = `calc(50vh - ${dialog.offsetHeight >> 1}px)`;
	document.body.addEventListener('keydown', keyboardListener);
}

function send(target, subject, action, data = {}, callback = _ => {}) {
	brauzer.runtime.sendMessage({'target': target, 'subject': subject, 'action': action, 'data': data}, callback);
}

})();