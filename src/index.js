//import iziToast from "izitoast";
var myEventHandler = undefined;

export default {
    onload: ({ extensionAPI }) => {
        window.roamAlphaAPI.ui.commandPalette.addCommand({
            label: "Word Count",
            callback: () => wordCount(),
        });

        myEventHandler = function (e) {
            if (e.key.toLowerCase() === 'q' && e.altKey && e.shiftKey) {
                getSelectionText();
            }
        }
        window.addEventListener('keydown', myEventHandler, false);
    },
    onunload: () => {
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'Word Count'
        });
        window.removeEventListener('keydown', myEventHandler, false);
    }
}

// get selection text
function getSelectionText() {
    var selectedText = '';
    if (window.getSelection) {
        selectedText = window.getSelection();
    } else if (document.getSelection) {
        selectedText = document.getSelection();
    } else if (document.selection) {
        selectedText = document.selection.createRange().text;
    } else return;
    var words = selectedText.toString();
    var wordsCount = words.split(" ").length;
    if (wordsCount == 1) {
        wordsCount = "N/A";
    }
    iziToast.show({
        theme: 'dark',
        message: wordsCount+' words in selected text',
        position: 'center',
        close: false,
        timeout: 5000,
        closeOnClick: true,
        displayMode: 2
    });
}

async function wordCount() {
    var wordCount = 0;
    var startBlock;
    startBlock = await window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
    if (startBlock == undefined) {
        startBlock = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
        let q = `[:find (pull ?page [:node/title]) :where [?page :block/uid "${startBlock}"] ]`;
        var results = await window.roamAlphaAPI.q(q);
        var pageTitle = results[0][0].title;
    } else {
        // get page title
        var blockUIDList = ['' + startBlock + ''];
        var rule = '[[(ancestor ?b ?a)[?a :block/children ?b]][(ancestor ?b ?a)[?parent :block/children ?b ](ancestor ?parent ?a) ]]';
        var query = `[:find  (pull ?block [:block/uid :block/string])(pull ?page [:node/title :block/uid]) :in $ [?block_uid_list ...] % :where [?block :block/uid ?block_uid_list] [?page :node/title] (ancestor ?block ?page)]`;
        var results = await window.roamAlphaAPI.q(query, blockUIDList, rule);
        var pageTitle = results[0][1].title;
    }

    // get words in blocks on page
    let ancestorrule = `[ [ (ancestor ?b ?a) [?a :block/children ?b] ] [ (ancestor ?b ?a) [?parent :block/children ?b ] (ancestor ?parent ?a) ] ] ]`;
    let blocks = window.roamAlphaAPI.q(`[ :find ?string :in $ ?pagetitle % :where [?block :block/string ?string] [?page :node/title ?pagetitle] (ancestor ?block ?page) ]`, pageTitle, ancestorrule);
    blocks.map((data, index) => { return data[0]; }).join('\n');

    for (var i = 0; i < blocks.length; i++) {
        wordCount = wordCount + blocks[i][0].split(" ").length;
    }
    
    iziToast.show({
        theme: 'dark',
        message: wordCount + " words on this page",
        position: 'center',
        close: false,
        timeout: 5000,
        closeOnClick: true,
        displayMode: 2
    });
};