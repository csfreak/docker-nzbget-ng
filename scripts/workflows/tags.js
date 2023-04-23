

module.exports = async ({github, context, core}) => {
    core.debug('started');
    const shas = await github.paginate(
        github.rest.git.listMatchingRefs,
        {
            owner: 'nzbget-ng',
            repo: 'nzbget',
            ref: 'tags'
        },
        (response) => response.data.map((ref) => ref.object.sha)
    );

    core.debug("Tag Sha List:  ${shas}");
    var tags = [];

    await Promise.all(shas.map(async (sha) => {
        const { data: ref } = await github.rest.git.getTag({
            owner: 'nzbget-ng',
            repo: 'nzbget',
            tag_sha: sha
        });
        core.debug("Tag Ref: ${ref}");
        const msPerDay = 24 * 60 * 60 * 1000;
        if (Date.now()-Date.Parse(ref.tagger.date)/msPerDay < 30)
            tags.push(ref.tag);
    }))
        
    core.info("Tag List: ${tags}");
    return tags;
}

