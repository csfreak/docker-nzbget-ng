

module.exports = async ({github, context, core}) => {
    core.info('Tag Processor Started');
    core.info('Getting Upstream Tags')
    const tags = await github.paginate(
        github.rest.repos.listTags,
        {
            owner: 'nzbget-ng',
            repo: 'nzbget',
            ref: 'tags'
        },
        (response) => response.data.map((ref) => ref.name)
    );

    core.info(`Tag List:  ${tags}`);

    core.info('Getting Existings Packages')
    const image_tags = new Set(await github.paginate(
        github.rest.packages.getAllPackageVersionsForPackageOwnedByUser,
        {
            package_type: 'docker',
            package_name: 'nzbget-ng',
            username: context.repo.owner,
        },
        (response) => response.data.map((pkg) => pkg.name)
    ).catch((err) => {
        if (err.status === 404)
            return [];
        throw new Erorr(err);
    }));

    core.info(`Existing Package Tag List: ${image_tags}`)

    const tag_re = new RegExp(/^v\d+\.\d+(?:-rc\d+)?$/);
    const build_tags = tags.filter((tag) => tag_re.test(tag) );

    core.info(`Filtered Tag List: ${build_tags}`)

    const unbuilt_tags = build_tags.filter((tag) => !image_tags.has(tag));

    core.info(`Unbuilt Tag List: ${unbuilt_tags}`)

    const msInDay = 86400000; // 24 * 60 * 60 * 1000

    core.info("Filtering Tags not updated in the last 90 days")
    var new_tags = await Promise.all(unbuilt_tags.map(async(tag) => {
        try {
            const { data: ref_data } = await github.rest.git.getRef({
                owner: 'nzbget-ng',
                repo: 'nzbget',
                ref: `tags/${tag}`
            })
            var date = null;
            try {
                const response = await github.rest.git.getTag({
                    owner: 'nzbget-ng',
                    repo: 'nzbget',
                    tag_sha: ref_data.object.sha
                })
                core.debug(response)
                date = response.data.tagger.date
            } catch (err) {
                if (err.status === 404) {
                    console.info(`ref for tag ${tag} not found; Trying commit`);
                    const response = await github.rest.git.getCommit({
                        owner: 'nzbget-ng',
                        repo: 'nzbget',
                        commit_sha: ref_data.object.sha
                    });
                    core.debug(response);
                    date = response.data.committer.date;
                } else {
                    throw new Error(err);
                }
            }
            core.info(`Found date ${date} for tag ${tag}`);
            return tag ? Date.now() - Date.parse(date) / msInDay < 90 : ''
        } catch (err) {
            core.info(`Failed to load ${tag}: ${err}`)
            return null
        }
        
    }));

    new_tags = new_tags.filter((tag) => tag);
    core.info(`New Tag List: ${new_tags}`);

    return new_tags.filter((tag) => tag)
    
}