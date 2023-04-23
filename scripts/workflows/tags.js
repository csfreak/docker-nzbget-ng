

module.exports = async ({github, context, core}) => {
    core.debug('Tag Processor Started');
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

    core.debug(`Tag List:  ${tags}`);

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

    core.debug(`Existing Package Tag List: ${image_tags}`)

    const tag_re = new RegExp(/^v\d+\.\d+(?:-rc\d+)?$/);
    const build_tags = tags.filter((tag) => tag_re.test(tag) );

    core.debug(`Filtered Tag List: ${build_tags}`)

    const unbuilt_tags = build_tags.filter((tag) => !image_tags.has(tag));

    core.debug(`Unbuilt Tag List: ${unbuilt_tags}`)

    const msInDay = 86400000; // 24 * 60 * 60 * 1000

    core.debug("Filtering Tags not updated in the last 90 days")
    const new_tags = unbuilt_tags.filter(async(tag) => {
        try {
            const { data: ref_data } = await github.rest.git.getRef({
                owner: 'nzbget-ng',
                repo: 'nzbget',
                ref: `tags/${tag}`
            })
            const { data: tag_data } = await github.rest.git.getTag({
                owner: 'nzbget-ng',
                repo: 'nzbget',
                tag_sha: ref_data.object.sha
            })
            core.debug(` Found date ${tag_data.tagger.date} for tag ${tag}`)
            return Date.parse(tag_data.tagger.date) - Date.now() / msInDay > 90
        } catch {
            return False
        }
        
    });

    core.info(`New Tag List: ${new_tags}`)

    return new_tags
    
}