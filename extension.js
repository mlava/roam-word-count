export default {
    onload: ({ extensionAPI }) => {
        window.roamAlphaAPI.ui.commandPalette.addCommand({
            label: "Word Count",
            callback: () => wordCount(),
        });

        async function wordCount() {
            var wordCount = 0;
            const startBlock = await window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];

            var blockUIDList = ['' + startBlock + ''];
            var rule = '[[(ancestor ?b ?a)[?a :block/children ?b]][(ancestor ?b ?a)[?parent :block/children ?b ](ancestor ?parent ?a) ]]';
            var query = `[:find  (pull ?block [:block/uid :block/string])(pull ?page [:node/title :block/uid])
                                     :in $ [?block_uid_list ...] %
                                     :where
                                      [?block :block/uid ?block_uid_list]
                                     [?page :node/title]
                                     (ancestor ?block ?page)]`;
            var results = await window.roamAlphaAPI.q(query, blockUIDList, rule);
            var pageTitle = results[0][1].title;

            let ancestorrule = `[ 
                [ (ancestor ?b ?a) 
                        [?a :block/children ?b] ] 
                [ (ancestor ?b ?a) 
                        [?parent :block/children ?b ] 
                        (ancestor ?parent ?a) ] ] ]`;
                            let blocks = window.roamAlphaAPI.q(`[ 
                :find 
                    ?string
                :in $ ?pagetitle % 
                :where 
                    [?block :block/string ?string] 
                    [?page :node/title ?pagetitle] 
                    (ancestor ?block ?page)
                ]`, pageTitle, ancestorrule);

            blocks.map((data, index) => { return data[0]; }).join('\n');

            for (var i = 0; i < blocks.length; i++) {
                wordCount = wordCount + blocks[i][0].split(" ").length;
            }
            // console.error(wordCount);
            alert(wordCount+" words on this page");
        };
    },
    onunload: () => {
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'Word Count'
        });
    }
}