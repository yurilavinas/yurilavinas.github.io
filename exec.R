#Setup
library(rmarkdown)
library(knitr)
library(beepr)
library(dplyr)

setwd("~/Documents/estudos/webpage/")

knitr::opts_chunk$set(echo = TRUE, include = TRUE, cache=TRUE, fig.width = 8, fig.height=6, fig.align="center", background = c(.95,.95,.95),message=FALSE)

#Plotly
x <- y <- list('fixedrange'= TRUE)

#Execute
render_site()
beep()  #finished rendering