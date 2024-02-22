import iziToast from "izitoast";

export default {
    onload: ({ extensionAPI }) => {
        extensionAPI.ui.commandPalette.addCommand({
            label: "Word Count (page)",
            callback: () => wordCount(),
        });
        extensionAPI.ui.commandPalette.addCommand({
            label: "Word Count (selected text only)",
            callback: () => getSelectionText(),
        });
        window.roamAlphaAPI.ui.blockContextMenu.addCommand({
            label: "Word Count (selected block(s) only)",
            callback: (e) => getSelectionText(e),
        });
    },
    onunload: () => {
        window.roamAlphaAPI.ui.blockContextMenu.removeCommand({
            label: "Word Count (selected block(s) only)",
            callback: (e) => getSelectionText(e),
        });
    }
}

// get selection text
async function getSelectionText(e) {
    let uids = await roamAlphaAPI.ui.individualMultiselect.getSelectedUids();
    var text = "";
    var wordsCount = 0;

    if (e) { // block context menu
        if (uids.length === 0) { // one block only
            text += e["block-string"].toString().trim();
        } else { // block multi-select mode
            for (var i = 0; i < uids.length; i++) {
                var results = await window.roamAlphaAPI.data.pull("[:block/string]", [":block/uid", uids[i]]);
                text += results[":block/string"].toString().trim() + " ";
            }
        }
    } else if (uids.length === 0) { // command palette and not multi-select mode
        wordCount(true);
        return;
    } else { // block multi-select mode and command palette
        for (var i = 0; i < uids.length; i++) {
            var results = await window.roamAlphaAPI.data.pull("[:block/string]", [":block/uid", uids[i]]);
            text += results[":block/string"].toString().trim() + " ";
        }
    }
    
    if (text != "") {
        //words = text.split(" ").length;
        let CJK = await getCJKCount(text.toString());
        wordsCount = wordsCount + CJK;
    }
    if (wordsCount == 1) {
        wordsCount = "N/A";
    }
    iziToast.show({
        theme: 'dark',
        message: wordsCount + ' words in selected text',
        position: 'center',
        close: false,
        timeout: 5000,
        closeOnClick: true,
        displayMode: 2
    });
}

async function wordCount(selected) {
    var wordCount = 0;
    var startBlock;
    startBlock = await window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
    if (startBlock == undefined) {
        startBlock = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
        if (startBlock == null) { // probably roam.log page
            var uri = window.location.href;
            const regex = /^https:\/\/roamresearch.com\/.+\/(app|offline)\/\w+$/; // log page
            if (regex.test(uri)) { // definitely a log page, so get the corresponding page uid
                var today = new Date();
                var dd = String(today.getDate()).padStart(2, '0');
                var mm = String(today.getMonth() + 1).padStart(2, '0');
                var yyyy = today.getFullYear();
                startBlock = mm + '-' + dd + '-' + yyyy;
                let q = `[:find (pull ?page [:node/title]) :where [?page :block/uid "${startBlock}"] ]`;
                var results = await window.roamAlphaAPI.q(q);
                var pageTitle = results[0][0].title;
            }
        } else {
            let q = `[:find (pull ?page [:node/title]) :where [?page :block/uid "${startBlock}"] ]`;
            var results = await window.roamAlphaAPI.q(q);
            var pageTitle = results[0][0].title;
        }
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
        //wordCount = wordCount + blocks[i][0].split(" ").length;
        let CJK = await getCJKCount(blocks[i][0].toString());
        wordCount = wordCount + CJK;
    }

    var toast = "";
    toast += wordCount + " words on this page";
    if (selected) {
        toast += "  (No selected text!)";
    }

    iziToast.show({
        theme: 'dark',
        message: toast,
        position: 'center',
        close: false,
        timeout: 5000,
        closeOnClick: true,
        displayMode: 2
    });
};

async function getCJKCount(text) { // found here: https://devv.ai/zh/search?threadId=ddiho7ad3e9s
    // Define regular expressions
    var cjkRegEx = /[\u3400-\u4db5\u4e00-\u9fa5\uf900-\ufa2d]/; // Matches all CJK ideographs
    var wordBreakRegEx = /\W/; // Matches all characters that "break up" words

    // Initialize variables
    var wordCount = 0;
    var inWord = false;
    var length = text.length;

    // Iterate through the text
    for (var i = 0; i < length; i++) {
        var curChar = text.charAt(i);
        if (cjkRegEx.test(curChar)) {
            // Character is a CJK ideograph
            // Count it as a word
            wordCount += inWord ? 2 : 1;
            inWord = false;
        } else if (wordBreakRegEx.test(curChar)) {
            // Character is a "word-breaking" character
            // If a word was started, increment the word count
            if (inWord) {
                wordCount += 1;
                inWord = false;
            }
        } else {
            // All other characters are "word" characters
            // Indicate that a word has begun
            inWord = true;
        }
    }

    // If the text ended while in a word, make sure to count it
    if (inWord) {
        wordCount += 1;
    }

    return wordCount;
}