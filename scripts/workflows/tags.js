

module.exports = async ({github, context, core}) => {
    core.debug('Tag Processor Started');
    core.info('Getting Upstream Tags')
    const tags = await github.paginate(
        github.rest.git.listMatchingRefs,
        {
            owner: 'nzbget-ng',
            repo: 'nzbget',
            ref: 'tags'
        },
        (response) => response.data.map((ref) => ref.name)
    );

    core.debug("Tag List:  ${tags}");

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

    core.debug("Existing Package Tag List: ${image_tags}")

    const tag_re = new RegExp(/^v\d+\.\d+(?:-rc\d+)?$/);
    const build_tags = tags.filter((tag) => tag_re.test(tag));

    core.debug("Filtered Tag List: ${build_tags}")

    const new_tags = build_tags.filter((tag) => !image_tags.has(tag));

    core.info("New Tag List: ${new_tags}")

    return new_tags
    
}

