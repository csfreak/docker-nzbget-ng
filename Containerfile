FROM gcc:bullseye as builder

ARG VERSION=v21.1
WORKDIR /build
ADD https://github.com/nzbget-ng/nzbget/archive/refs/tags/${VERSION}.tar.gz .

RUN tar -zxf ${VERSION}.tar.gz --strip-components 1 
RUN ./configure --disable-curses
RUN make

FROM gcr.io/distroless/base-debian11:nonroot
ENV CONFIG=/config/nzbget.conf
VOLUME ["/config", "/downloads"]
EXPOSE 6789
WORKDIR /nzbget
COPY --from=builder /build/nzbget /build/webui ./
COPY --from=builder /build/nzbget.conf ./webui/nzbget.conf.template
CMD [ "nzbget", "-s", "-o", "outputmode=log", "-c", "${CONFIG}"]